import React, { useEffect, useState } from "react";
import { Submission } from "../../types/extraction.types";
import {
  uploadCnicForName,
  uploadDocumentsForFields,
} from "../../service/extractionService";

import Stepper from "../Reusable/Stepper";
import { useNavigate, useParams } from "react-router";
import { SubmissionService } from "../../service/submissionService";
import Step1IdentityUpload from "../Documents/Step1IdentityUpload";
import Step2DocumentsUpload from "../Documents/Step2DocumentsUpload";
import Step3ReviewFields from "../Documents/Step3ReviewFields";

import { FiArrowLeft, FiTag } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../redux/store";
import { addToast } from "../../redux/slices/toasterSlice";
import { SubmissionDocumentsService } from "../../service/submissionDocumentService";
import Step4GenerateDocument from "../Documents/Step4GenerateDocument";
import PageHeader from "../Reusable/PageHeader";

const pillBase =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium";

function statusPill(status?: string) {
  const s = (status || "").toLowerCase();
  if (["approved", "completed", "success", "done"].includes(s))
    return `${pillBase} bg-success border-success-border text-success-text`;
  if (["rejected", "failed", "error"].includes(s))
    return `${pillBase} bg-danger border-danger-border text-danger-text`;
  if (
    ["in_review", "review", "pending", "processing", "in_progress"].includes(s)
  )
    return `${pillBase} bg-warning border-warning-border text-warning-text`;
  return `${pillBase} bg-info border-info-border text-info-text`;
}

const SubmissionManagementPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSubmission = async () => {
      if (!id) return;
      try {
        setSubmissionLoading(true);
        const p = await SubmissionService.getSubmissionById(id);
        setSubmission(p?.submission || null);
        if (p?.submission?.legal_name) {
          setManualLegalName(p?.submission?.legal_name);
          setCnicName(p?.submission?.legal_name);
          setCurrentStep(2);
          setMaxUnlockedStep(2);
        }
        if (
          p?.submission?.documents?.length &&
          p?.submission?.documents?.length > 0
        ) {
          setCurrentStep(3);
          setMaxUnlockedStep(4);
        }
      } catch (e) {
        console.error(e);
        setSubmission(null);
      } finally {
        setSubmissionLoading(false);
      }
    };
    fetchSubmission();
  }, [id]);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<1 | 2 | 3 | 4>(4);
  const [cnicFile, setCnicFile] = useState<File | null>(null);
  const [cnicName, setCnicName] = useState<string | null>(null);
  const [cnicLoading, setCnicLoading] = useState(false);
  const [cnicError, setCnicError] = useState<string | null>(null);

  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [manualLegalName, setManualLegalName] = useState("");

  const handleManualContinue = async () => {
    const name = manualLegalName.trim();

    try {
      setCnicLoading(true);
      const resp = await SubmissionService.updateSubmission(id, {
        legal_name: name,
      });
      if (!resp?.success) {
        throw new Error(resp?.message);
      }
      setCnicName(resp.submission?.legal_name!);
      setSubmission(resp.submission);
      setCurrentStep(2);
      setMaxUnlockedStep(2);
    } catch (e: any) {
      console.error(e);
    } finally {
      setCnicLoading(false);
    }
  };
  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCnicFile(file);
    setCnicName(null);
    setCnicError(null);
  };

  const handleCnicSubmit = async () => {
    if (!cnicFile) {
      setCnicError("Please select an identification document first.");
      return;
    }
    try {
      setCnicLoading(true);
      setCnicError(null);
      const resp = await uploadCnicForName(submission?._id, cnicFile);
      if (!resp.legalName) {
        dispatch(
          addToast({
            message: resp.message,
            type: "success",
            duration: 7000,
          }),
        );
        return;
      }
      setCnicName(resp.legalName);
      setSubmission(resp.submission);
      setCurrentStep(2);
      if (maxUnlockedStep < 2) setMaxUnlockedStep(2);
    } catch (err: any) {
      setCnicError(
        err?.message || "Failed to process identification document.",
      );
    } finally {
      setCnicLoading(false);
    }
  };

  const handleDocsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setDocFiles(files);
  };

  type DocProcessResult = {
    original_name?: string;
    ok?: boolean;
    reason?: string;
  };

  function buildDocsErrorMessage(resp: any) {
    const lines: string[] = [];

    // top-level reason/message
    if (resp?.reason) lines.push(resp.reason);
    else if (resp?.message) lines.push(resp.message);

    // per-document errors
    const results: DocProcessResult[] = Array.isArray(resp?.results)
      ? resp.results
      : [];

    const failed = results.filter((r) => r && r.ok === false);

    if (failed.length) {
      const MAX = 6; // avoid huge toast
      failed.slice(0, MAX).forEach((r) => {
        const name = r.original_name || "Document";
        const reason = r.reason || "Failed to process.";
        lines.push(`• ${name}: ${reason}`);
      });

      if (failed.length > MAX) {
        lines.push(`• ...and ${failed.length - MAX} more`);
      }
    }

    // final fallback
    if (!lines.length) lines.push("Failed to process documents.");

    return lines.join("\n");
  }

  const handleDocsSubmit = async () => {
    if (!docFiles.length) {
      dispatch(
        addToast({
          message: "Please select at least one document.",
          type: "error",
        }),
      );
      return;
    }

    try {
      setDocsLoading(true);

      const resp: any = await uploadDocumentsForFields(
        docFiles,
        submission?._id,
        cnicName,
      );

      // ✅ Case 1: backend explicitly says failure (your sample response)
      if (resp?.success === false) {
        const msg = buildDocsErrorMessage(resp);

        dispatch(
          addToast({
            type: "error",
            message: msg,
            duration: 9000,
          }),
        );

        return; // don't move to next step
      }

      // ✅ Case 2: partial failures but overall success (if your API does that)
      // Show errors for failed docs, but still continue.
      if (Array.isArray(resp?.results)) {
        const failed = resp.results.filter((r: any) => r?.ok === false);
        if (failed.length) {
          dispatch(
            addToast({
              type: "error",
              message: buildDocsErrorMessage(resp),
              duration: 9000,
            }),
          );
        }
      }

      // normal success flow
      if (resp?.submission) {
        setSubmission(resp.submission);
        setCurrentStep(3);
        setMaxUnlockedStep(4);
      } else {
        // fallback if submission not returned
        dispatch(
          addToast({
            type: "error",
            message: "Documents processed but submission payload is missing.",
            duration: 7000,
          }),
        );
      }
    } catch (err: any) {
      // try to read backend error payload too (axios-style)
      const backend = err?.response?.data;
      const msg = backend ? buildDocsErrorMessage(backend) : null;

      dispatch(
        addToast({
          type: "error",
          message: msg || err?.message || "Failed to process documents.",
          duration: 9000,
        }),
      );
    } finally {
      setDocsLoading(false);
    }
  };

  const handleReplaceExisting = async (docEntryId: string, file: File) => {
    if (!submission?._id) return;

    const resp = await SubmissionDocumentsService.replace(
      submission._id,
      docEntryId,
      file,
    );

    // backend returns updated submission (after recompute)
    if (resp?.submission) {
      setSubmission(resp.submission);
    }
  };

  const handleDeleteExisting = async (docEntryId: string) => {
    if (!submission?._id) return;

    const resp = await SubmissionDocumentsService.remove(
      submission._id,
      docEntryId,
    );
    if (resp?.submission) {
      setSubmission(resp.submission);
    }
  };

  const submissionName = submission?.submission_name || "Submission";
  const submissionStatus = submission?.status || "In Progress";

  return (
    <div className="font-sora min-h-screen bg-background text-text">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Title + Overview */}
        <div>
          {submissionLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-6 w-64 rounded-full bg-card-hover" />
              <div className="h-4 w-96 rounded-full bg-card-hover" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl border border-card-border bg-background"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <PageHeader
                title={submissionName}
                left={
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-3 py-2 text-sm text-text hover:bg-card-hover transition-colors"
                    title="Back"
                  >
                    <FiArrowLeft />
                    Back
                  </button>
                }
                right={
                  <span className={statusPill(submissionStatus)}>
                    <FiTag className="h-3.5 w-3.5" />
                    {submissionStatus}
                  </span>
                }
              />
            </>
          )}
        </div>

        <Stepper
          currentStep={currentStep}
          maxUnlockedStep={maxUnlockedStep}
          onStepChange={(step) => setCurrentStep(step as 1 | 2 | 3)}
          steps={[
            { step: 1, label: "Upload Identification Document" },
            { step: 2, label: "Upload Documents" },
            { step: 3, label: "Review Fields" },
            { step: 4, label: "Populations" },
          ]}
        />

        {/* Step Content (same as your code) */}
        <div className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
          {currentStep === 1 && (
            <Step1IdentityUpload
              cnicFile={cnicFile}
              cnicName={cnicName}
              loading={cnicLoading}
              error={cnicError}
              onFileChange={handleCnicChange}
              onSubmit={handleCnicSubmit}
              manualName={manualLegalName}
              setManualName={setManualLegalName}
              onManualContinue={handleManualContinue}
            />
          )}

          {currentStep === 2 && (
            <Step2DocumentsUpload
              docFiles={docFiles}
              loading={docsLoading}
              onFileChange={handleDocsChange}
              onSubmit={handleDocsSubmit}
              onBack={() => setCurrentStep(1)}
              existingDocuments={submission?.documents || []}
              onReplaceExisting={handleReplaceExisting}
              onDeleteExisting={handleDeleteExisting}
            />
          )}

          {currentStep === 3 && (
            <Step3ReviewFields
              submissionId={submission?._id!}
              onBack={() => setCurrentStep(2)}
              onSubmissionUpdated={(s) => setSubmission(s)}
            />
          )}

          {currentStep === 4 && (
            <Step4GenerateDocument
              submissionId={submission?._id!}
              onBack={() => setCurrentStep(3)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionManagementPage;
