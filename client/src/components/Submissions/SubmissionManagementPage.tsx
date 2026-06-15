import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useDispatch } from "react-redux";
import { FiArrowLeft, FiTag } from "react-icons/fi";
import type { Submission } from "../../types/extraction.types";
import { AppDispatch } from "../../redux/store";
import { addToast } from "../../redux/slices/toasterSlice";
import { SubmissionService } from "../../service/submissionService";
import { SubmissionDocumentsService } from "../../service/submissionDocumentService";
import {
  uploadCnicForName,
  uploadDocumentsForFields,
} from "../../service/extractionService";
import Stepper from "../Reusable/Stepper";
import PageHeader from "../Reusable/PageHeader";
import Step1IdentityUpload from "../Documents/Step1IdentityUpload";
import Step2DocumentsUpload from "../Documents/Step2DocumentsUpload";
import Step3ReviewFields from "../Documents/Step3ReviewFields";
import Step4GenerateDocument from "../Documents/Step4GenerateDocument";

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { step: 1, label: "Legal name" },
  { step: 2, label: "Documents" },
  { step: 3, label: "Review fields" },
  { step: 4, label: "Generate" },
] as const;

const pillBase =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium";

function statusPill(status?: string) {
  const s = (status || "").toLowerCase();
  if (["approved", "completed", "success", "done"].includes(s))
    return `${pillBase} bg-success border-success-border text-success-text`;
  if (["rejected", "failed", "error"].includes(s))
    return `${pillBase} bg-danger border-danger-border text-danger-text`;
  if (["in_review", "review", "pending", "processing", "in_progress"].includes(s))
    return `${pillBase} bg-warning border-warning-border text-warning-text`;
  return `${pillBase} bg-info border-info-border text-info-text`;
}

type DocProcessResult = {
  original_name?: string;
  ok?: boolean;
  reason?: string;
};

function buildDocsErrorMessage(resp: unknown) {
  const r = resp as Record<string, unknown>;
  const lines: string[] = [];

  if (typeof r?.reason === "string") lines.push(r.reason);
  else if (typeof r?.message === "string") lines.push(r.message);

  const results = Array.isArray(r?.results) ? (r.results as DocProcessResult[]) : [];
  const failed = results.filter((item) => item && item.ok === false);

  if (failed.length) {
    const max = 6;
    failed.slice(0, max).forEach((item) => {
      const name = item.original_name || "Document";
      const reason = item.reason || "Failed to process.";
      lines.push(`• ${name}: ${reason}`);
    });
    if (failed.length > max) lines.push(`• ...and ${failed.length - max} more`);
  }

  if (!lines.length) lines.push("Failed to process documents.");
  return lines.join("\n");
}

export default function SubmissionManagementPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>(1);

  const [cnicFile, setCnicFile] = useState<File | null>(null);
  const [cnicName, setCnicName] = useState<string | null>(null);
  const [cnicLoading, setCnicLoading] = useState(false);
  const [cnicError, setCnicError] = useState<string | null>(null);
  const [manualLegalName, setManualLegalName] = useState("");

  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      setSubmissionLoading(true);
      const stepParam = searchParams.get("step");
      const initialStep =
        stepParam === "2" || stepParam === "documents" ? 2 : 1;
      setCurrentStep(initialStep as Step);
      try {
        const res = await SubmissionService.getSubmissionById(id);
        if (cancelled) return;
        const sub = res?.submission ?? null;
        setSubmission(sub);
        if (sub?.legal_name) {
          setManualLegalName(sub.legal_name);
          setCnicName(sub.legal_name);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setSubmission(null);
      } finally {
        if (!cancelled) setSubmissionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, searchParams]);

  const handleManualContinue = async () => {
    const name = manualLegalName.trim();
    if (!id) return;

    try {
      setCnicLoading(true);
      const resp = await SubmissionService.updateSubmission(id, { legal_name: name });
      if (!resp?.success) throw new Error(resp?.message);
      setCnicName(resp.submission?.legal_name ?? name);
      setSubmission(resp.submission ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setCnicLoading(false);
    }
  };

  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnicFile(e.target.files?.[0] ?? null);
    setCnicName(null);
    setCnicError(null);
  };

  const handleCnicSubmit = async () => {
    if (!cnicFile) {
      setCnicError("Please select an identification document first.");
      return;
    }
    if (!submission?._id) return;

    try {
      setCnicLoading(true);
      setCnicError(null);
      const resp = await uploadCnicForName(submission._id, cnicFile);
      if (!resp.legalName) {
        dispatch(
          addToast({ message: resp.message, type: "success", duration: 7000 })
        );
        return;
      }
      setCnicName(resp.legalName);
      setSubmission(resp.submission);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to process identification document.";
      setCnicError(message);
    } finally {
      setCnicLoading(false);
    }
  };

  const handleDocsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocFiles(e.target.files ? Array.from(e.target.files) : []);
  };

  const handleRemoveDocFile = (index: number) => {
    setDocFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocsSubmit = async (): Promise<boolean> => {
    if (!docFiles.length) {
      dispatch(addToast({ message: "Please select at least one document.", type: "error" }));
      return false;
    }

    try {
      setDocsLoading(true);
      const resp = (await uploadDocumentsForFields(
        docFiles,
        submission?._id,
        cnicName
      )) as Record<string, unknown>;

      if (resp?.success === false) {
        dispatch(
          addToast({
            type: "error",
            message: buildDocsErrorMessage(resp),
            duration: 9000,
          })
        );
        return false;
      }

      if (Array.isArray(resp?.results)) {
        const failed = (resp.results as DocProcessResult[]).filter((r) => r?.ok === false);
        if (failed.length) {
          dispatch(
            addToast({
              type: "error",
              message: buildDocsErrorMessage(resp),
              duration: 9000,
            })
          );
        }
      }

      if (resp?.submission) {
        setSubmission(resp.submission as Submission);
        setDocFiles([]);
        return true;
      }

      dispatch(
        addToast({
          type: "error",
          message: "Documents processed but submission payload is missing.",
          duration: 7000,
        })
      );
      return false;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown }; message?: string };
      const msg = axiosErr.response?.data
        ? buildDocsErrorMessage(axiosErr.response.data)
        : axiosErr.message || "Failed to process documents.";
      dispatch(addToast({ type: "error", message: msg, duration: 9000 }));
      return false;
    } finally {
      setDocsLoading(false);
    }
  };

  const handleReplaceExisting = async (docEntryId: string, file: File) => {
    if (!submission?._id) return;
    const resp = await SubmissionDocumentsService.replace(submission._id, docEntryId, file);
    if (resp?.submission) setSubmission(resp.submission);
  };

  const handleDeleteExisting = async (docEntryId: string) => {
    if (!submission?._id) return;
    const resp = await SubmissionDocumentsService.remove(submission._id, docEntryId);
    if (resp?.submission) setSubmission(resp.submission);
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 4) setCurrentStep(step as Step);
  };

  return (
    <div className="font-sora min-h-screen bg-background text-text">
      <div className="mx-auto max-w-6xl space-y-4">
        {submissionLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-6 w-64 rounded-full bg-card-hover" />
            <div className="h-10 w-full rounded-xl bg-card-hover" />
            <div className="h-64 rounded-2xl border border-card-border bg-card" />
          </div>
        ) : (
          <>
            <PageHeader
              title={submission?.submission_name || "Client"}
              left={
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card px-3 py-2 text-sm text-text hover:bg-card-hover transition-colors"
                >
                  <FiArrowLeft />
                  Back
                </button>
              }
              right={
                <span className={statusPill(submission?.status)}>
                  <FiTag className="h-3.5 w-3.5" />
                  {submission?.status || "In Progress"}
                </span>
              }
            />

            <Stepper
              currentStep={currentStep}
              onStepChange={goToStep}
              steps={[...STEPS]}
            />

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
                  clientTitle={submission?.submission_name}
                  clientLegalName={submission?.legal_name}
                  docFiles={docFiles}
                  loading={docsLoading}
                  onFileChange={handleDocsChange}
                  onRemoveDocFile={handleRemoveDocFile}
                  onSubmit={handleDocsSubmit}
                  onBack={() => setCurrentStep(1)}
                  existingDocuments={submission?.documents || []}
                  onReplaceExisting={handleReplaceExisting}
                  onDeleteExisting={handleDeleteExisting}
                />
              )}

              {currentStep === 3 && submission?._id && (
                <Step3ReviewFields
                  submissionId={submission._id}
                  onBack={() => setCurrentStep(2)}
                  onSubmissionUpdated={setSubmission}
                />
              )}

              {currentStep === 4 && submission?._id && (
                <Step4GenerateDocument
                  submissionId={submission._id}
                  onBack={() => setCurrentStep(3)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
