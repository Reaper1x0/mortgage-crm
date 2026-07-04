import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useDispatch } from "react-redux";
import { FiTag } from "react-icons/fi";
import type {
  IdentityDocument,
  SubmissionDocument,
  SubmissionSummary,
} from "../../types/extraction.types";
import { AppDispatch } from "../../redux/store";
import { addToast } from "../../redux/slices/toasterSlice";
import { SubmissionService } from "../../service/submissionService";
import {
  SubmissionDocumentsService,
} from "../../service/submissionDocumentService";
import type { FileUploadProgressCallback } from "../../utils/uploadProgress";
import { uploadCnicForName } from "../../service/extractionService";
import Stepper from "../Reusable/Stepper";
import PageHeader from "../Reusable/PageHeader";
import StatusBadge from "../Reusable/StatusBadge";
import type { StatusBadgeTone } from "../Reusable/StatusBadge";
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

function statusTone(status?: string): StatusBadgeTone {
  const s = (status || "").toLowerCase();
  if (["approved", "completed", "success", "done"].includes(s)) return "success";
  if (["rejected", "failed", "error"].includes(s)) return "danger";
  if (["in_review", "review", "pending", "processing", "in_progress"].includes(s)) return "warning";
  return "info";
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

  if (!lines.length) lines.push("Operation failed.");
  return lines.join("\n");
}

export default function SubmissionManagementPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  const [summary, setSummary] = useState<SubmissionSummary | null>(null);
  const [identityDocument, setIdentityDocument] = useState<IdentityDocument | null>(null);
  const [documents, setDocuments] = useState<SubmissionDocument[]>([]);
  const [submissionLoading, setSubmissionLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>(1);

  const [cnicName, setCnicName] = useState<string | null>(null);
  const [nameConfidence, setNameConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const [documentAuthenticity, setDocumentAuthenticity] = useState<
    "likely_genuine" | "uncertain" | "likely_template_or_sample" | null
  >(null);
  const [authenticityNote, setAuthenticityNote] = useState<string | null>(null);
  const [cnicLoading, setCnicLoading] = useState(false);
  const [cnicError, setCnicError] = useState<string | null>(null);
  const [manualLegalName, setManualLegalName] = useState("");

  const [extractingDocId, setExtractingDocId] = useState<string | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  const submissionId = summary?._id || id || "";

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      setSubmissionLoading(true);
      const stepParam = searchParams.get("step");
      const initialStep =
        stepParam === "2" || stepParam === "documents" ? 2 : 1;
      setCurrentStep(initialStep as Step);
      if (initialStep === 2) setDocumentsLoading(true);
      try {
        const res = await SubmissionService.getSummary(id);
        if (cancelled) return;
        const nextSummary = res?.summary ?? null;
        setSummary(nextSummary);
        if (nextSummary?.legal_name) {
          setManualLegalName(nextSummary.legal_name);
          setCnicName(nextSummary.legal_name);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setSubmissionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, searchParams]);

  const refreshIdentitySlice = async () => {
    if (!id) return;
    try {
      const res = await SubmissionService.getIdentity(id);
      if (!res) return;
      setIdentityDocument(res.identity_document ?? null);
      if (res.legal_name) {
        setManualLegalName(res.legal_name);
        setCnicName(res.legal_name);
        setSummary((prev) =>
          prev ? { ...prev, legal_name: res.legal_name ?? prev.legal_name } : prev
        );
      }
      const idDoc = res.identity_document;
      setNameConfidence(idDoc?.name_confidence ?? null);
      setDocumentAuthenticity(idDoc?.document_authenticity ?? null);
      setAuthenticityNote(idDoc?.authenticity_note ?? null);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshDocumentsSlice = async () => {
    if (!id) return;
    try {
      setDocumentsLoading(true);
      const res = await SubmissionDocumentsService.list(id);
      setDocuments((res?.documents || []) as SubmissionDocument[]);
    } catch (e) {
      console.error(e);
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    if (!id || submissionLoading || !summary) return;
    if (currentStep === 1) {
      void refreshIdentitySlice();
    } else if (currentStep === 2) {
      void refreshDocumentsSlice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, id, submissionLoading, summary?._id]);

  const handleManualContinue = async () => {
    const name = manualLegalName.trim();
    if (!id) return;

    try {
      setCnicLoading(true);
      const resp = await SubmissionService.updateSubmission(id, { legal_name: name });
      if (!resp?.success) throw new Error(resp?.message);
      const legalName = resp.submission?.legal_name ?? name;
      setCnicName(legalName);
      setSummary((prev) => (prev ? { ...prev, legal_name: legalName } : prev));
      setDocumentsLoading(true);
      setCurrentStep(2);
    } catch (e) {
      console.error(e);
    } finally {
      setCnicLoading(false);
    }
  };

  const handleUploadIdentity = async (
    file: File,
    onProgress: FileUploadProgressCallback
  ) => {
    if (!submissionId) throw new Error("Submission not found.");

    setCnicError(null);
    const resp = await uploadCnicForName(submissionId, file, onProgress);
    setIdentityDocument(resp.identity_document ?? null);
    setNameConfidence(resp.nameConfidence ?? resp.identity_document?.name_confidence ?? null);
    setDocumentAuthenticity(
      resp.documentAuthenticity ?? resp.identity_document?.document_authenticity ?? null
    );
    setAuthenticityNote(resp.authenticityNote ?? resp.identity_document?.authenticity_note ?? null);

    const identitySaved = Boolean(resp.identity_document?.file);
    if (!identitySaved) throw new Error("Identity document was not saved.");

    if (resp.legal_name) {
      setSummary((prev) => (prev ? { ...prev, legal_name: resp.legal_name } : prev));
    }

    if (resp.legalName) {
      setCnicName(resp.legalName);
      if (
        resp.documentAuthenticity === "likely_template_or_sample" ||
        resp.nameConfidence === "low"
      ) {
        dispatch(
          addToast({
            message:
              resp.authenticityNote ||
              resp.message ||
              "Name extracted, but document authenticity could not be verified.",
            type: "warning",
            duration: 9000,
          })
        );
      }
      return;
    }

    setCnicName("");
    dispatch(addToast({ message: resp.message, type: "warning", duration: 7000 }));
  };

  const identityPreviewUrl = useMemo(() => {
    const file = identityDocument?.file;
    if (file && typeof file === "object") {
      return file.url || file.meta?.thumbnail_url || null;
    }
    return null;
  }, [identityDocument?.file]);

  const identityDocumentName = useMemo(() => {
    if (identityDocument?.document_name) {
      return identityDocument.document_name;
    }
    const file = identityDocument?.file;
    if (file && typeof file === "object") {
      return file.display_name || file.original_name || null;
    }
    return null;
  }, [identityDocument]);

  const handleUploadDocument = async (
    file: File,
    onProgress: FileUploadProgressCallback
  ) => {
    if (!submissionId) throw new Error("Submission not found.");
    const resp = await SubmissionDocumentsService.upload(submissionId, file, onProgress);
    if (resp?.documents) {
      setDocuments(resp.documents);
    }
  };

  const handleDocumentsUploaded = () => {
    dispatch(
      addToast({
        type: "success",
        message: "Documents uploaded successfully.",
        duration: 5000,
      })
    );
  };

  const handleExtractFields = async (docEntryId: string): Promise<boolean> => {
    if (!submissionId) return false;

    try {
      setExtractingDocId(docEntryId);
      const resp = await SubmissionDocumentsService.extract(submissionId, docEntryId);

      if (resp?.documents) {
        setDocuments(resp.documents);
        dispatch(
          addToast({
            type: "success",
            message: `Extracted ${resp.extracted_fields_count} field${resp.extracted_fields_count === 1 ? "" : "s"}.`,
            duration: 5000,
          })
        );
        return true;
      }

      dispatch(
        addToast({
          type: "error",
          message: "Extraction completed but documents payload is missing.",
          duration: 7000,
        })
      );
      return false;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown }; message?: string };
      const msg = axiosErr.response?.data
        ? buildDocsErrorMessage(axiosErr.response.data)
        : axiosErr.message || "Failed to extract fields.";
      dispatch(addToast({ type: "error", message: msg, duration: 9000 }));
      return false;
    } finally {
      setExtractingDocId(null);
    }
  };

  const handleReplaceExisting = async (
    docEntryId: string,
    file: File,
    onProgress?: FileUploadProgressCallback
  ) => {
    if (!submissionId) return;
    const resp = await SubmissionDocumentsService.replace(
      submissionId,
      docEntryId,
      file,
      onProgress
    );
    if (resp?.documents) {
      setDocuments(resp.documents);
      dispatch(
        addToast({
          type: "success",
          message: "Document replaced. Extract fields when ready.",
          duration: 5000,
        })
      );
    }
  };

  const handleDeleteExisting = async (docEntryId: string) => {
    if (!submissionId) return;
    const resp = await SubmissionDocumentsService.remove(submissionId, docEntryId);
    if (resp?.documents) setDocuments(resp.documents);
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 4) {
      if (step === 2) setDocumentsLoading(true);
      setCurrentStep(step as Step);
    }
  };

  return (
    <div className="min-h-screen w-full min-w-0 bg-background text-text">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
        {submissionLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-6 w-64 rounded-full bg-card-hover" />
            <div className="h-10 w-full rounded-xl bg-card-hover" />
            <div className="h-64 rounded-2xl border border-card-border bg-card" />
          </div>
        ) : (
          <>
            <PageHeader
              back={{ label: "Back", onClick: () => navigate(-1) }}
              title={summary?.submission_name || "Client"}
              actions={
                <StatusBadge tone={statusTone(summary?.status)}>
                  <FiTag className="h-3.5 w-3.5" />
                  {summary?.status || "In Progress"}
                </StatusBadge>
              }
            />

            <Stepper
              currentStep={currentStep}
              onStepChange={goToStep}
              steps={[...STEPS]}
            />

            <div className="min-w-0 overflow-hidden rounded-2xl border border-card-border bg-card p-4 shadow-sm sm:p-5">
              {currentStep === 1 && (
                <Step1IdentityUpload
                  cnicName={cnicName}
                  nameConfidence={nameConfidence}
                  documentAuthenticity={documentAuthenticity}
                  authenticityNote={authenticityNote}
                  identityPreviewUrl={identityPreviewUrl}
                  identityDocumentName={identityDocumentName}
                  manualSubmitting={cnicLoading}
                  error={cnicError}
                  uploadIdentity={handleUploadIdentity}
                  onIdentityUploaded={() => void refreshIdentitySlice()}
                  onUploadError={setCnicError}
                  manualName={manualLegalName}
                  setManualName={setManualLegalName}
                  onManualContinue={handleManualContinue}
                  onContinue={() => {
                    setDocumentsLoading(true);
                    setCurrentStep(2);
                  }}
                />
              )}

              {currentStep === 2 && (
                <Step2DocumentsUpload
                  clientTitle={summary?.submission_name}
                  clientLegalName={summary?.legal_name}
                  existingDocuments={documents}
                  documentsLoading={documentsLoading}
                  uploadDocument={handleUploadDocument}
                  onDocumentsUploaded={handleDocumentsUploaded}
                  onUploadFailed={(message) =>
                    dispatch(addToast({ type: "error", message, duration: 7000 }))
                  }
                  onExtractFields={handleExtractFields}
                  extractingDocId={extractingDocId}
                  replaceDocument={handleReplaceExisting}
                  onDeleteExisting={handleDeleteExisting}
                  onBack={() => setCurrentStep(1)}
                />
              )}

              {currentStep === 3 && submissionId && (
                <Step3ReviewFields
                  submissionId={submissionId}
                  onBack={() => setCurrentStep(2)}
                />
              )}

              {currentStep === 4 && submissionId && (
                <Step4GenerateDocument
                  submissionId={submissionId}
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
