import React, { useEffect, useMemo, useState } from "react";
import { FiArrowRight, FiRefreshCw, FiUpload } from "react-icons/fi";
import Input from "../Reusable/Inputs/Input";
import FileUploader from "../Reusable/Inputs/FileUploader";
import Button from "../Reusable/Button";
import Callout from "../Reusable/Callout";
import Modal from "../Reusable/Modal";
import type { FileUploadProgressCallback } from "../../utils/uploadProgress";
import { cn } from "../../utils/cn";

export type Step1Props = {
  cnicName: string | null;
  identityPreviewUrl?: string | null;
  identityDocumentName?: string | null;
  manualSubmitting?: boolean;
  error: string | null;
  uploadIdentity: (file: File, onProgress: FileUploadProgressCallback) => Promise<void>;
  onIdentityUploaded?: () => void;
  onUploadError?: (message: string) => void;
  manualName: string;
  setManualName: (v: string) => void;
  onManualContinue: () => void;
  onContinue: () => void;
};

const Step1IdentityUpload: React.FC<Step1Props> = ({
  cnicName,
  identityPreviewUrl = null,
  identityDocumentName = null,
  manualSubmitting = false,
  error,
  uploadIdentity,
  onIdentityUploaded,
  onUploadError,
  manualName,
  setManualName,
  onManualContinue,
  onContinue,
}) => {
  const [mode, setMode] = useState<"upload" | "manual">("upload");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);

  useEffect(() => {
    if (cnicName) setMode("upload");
  }, [cnicName]);

  useEffect(() => {
    if (!uploadModalOpen) {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
      setPickedFileName(null);
    }
  }, [uploadModalOpen, localPreviewUrl]);

  const displayImageUrl = localPreviewUrl || identityPreviewUrl;
  const displayDocumentName = pickedFileName || identityDocumentName;

  const canManualContinue = manualName.trim().length >= 3;

  const extractedState = useMemo(() => {
    if (cnicName) return "found";
    if (identityPreviewUrl || localPreviewUrl) return "notfound";
    if (cnicName === null) return "idle";
    return "notfound";
  }, [cnicName, identityPreviewUrl, localPreviewUrl]);

  const openUploadModal = () => setUploadModalOpen(true);
  const closeUploadModal = () => setUploadModalOpen(false);

  const handleFilesChange = (files: File[]) => {
    const file = files[0];
    if (!file) {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
      setPickedFileName(null);
      return;
    }
    setPickedFileName(file.name);
    if (file.type.startsWith("image/")) {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(URL.createObjectURL(file));
    } else {
      setLocalPreviewUrl(null);
    }
  };

  const isReextract = extractedState === "found" || Boolean(identityPreviewUrl || localPreviewUrl);

  const renderIdentityPreview = (className?: string) =>
    displayImageUrl ? (
      <div className={cn("overflow-hidden rounded-lg border border-card-border bg-card", className)}>
        <img
          src={displayImageUrl}
          alt="Uploaded identification document"
          className="h-40 w-full object-contain sm:h-44"
        />
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      <p className="text-sm text-card-text">
        Provide the client&apos;s full legal name by uploading an ID or typing it manually.
      </p>

      <div
        className="inline-flex w-full max-w-md rounded-lg border border-card-border bg-background p-1 sm:w-auto"
        role="tablist"
        aria-label="Legal name input method"
      >
        {(
          [
            { key: "upload" as const, label: "Upload ID" },
            { key: "manual" as const, label: "Enter manually" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={mode === opt.key}
            onClick={() => setMode(opt.key)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
              mode === opt.key
                ? "bg-card text-text shadow-sm"
                : "text-card-text hover:text-text"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && !uploadModalOpen ? (
        <Callout tone="danger" title="Something went wrong">
          {error}
        </Callout>
      ) : null}

      {mode === "upload" ? (
        <div className="space-y-4">
          {extractedState === "found" ? (
            <div className="rounded-xl border border-card-border bg-background overflow-hidden">
              <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,200px)_1fr] sm:items-start">
                {renderIdentityPreview()}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-card-text">
                      Extracted legal name
                    </p>
                    <p className="mt-1 text-lg font-semibold text-text">{cnicName}</p>
                    {displayDocumentName ? (
                      <p className="mt-1 text-xs text-card-text truncate">{displayDocumentName}</p>
                    ) : null}
                  </div>
                  <p className="text-sm text-card-text">
                    Name was read from the uploaded ID. Re-extract if you upload a different or clearer photo.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={openUploadModal}>
                      <span className="inline-flex items-center gap-2">
                        <FiRefreshCw className="h-4 w-4" />
                        Re-extract
                      </span>
                    </Button>
                    <Button variant="primary" onClick={onContinue}>
                      <span className="inline-flex items-center gap-2">
                        Continue to documents <FiArrowRight className="h-4 w-4" />
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : extractedState === "notfound" && displayImageUrl ? (
            <div className="rounded-xl border border-card-border bg-background overflow-hidden">
              <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,200px)_1fr] sm:items-start">
                {renderIdentityPreview()}
                <div className="space-y-3">
                  <Callout tone="warning" title="Name not detected">
                    ID was saved, but we couldn&apos;t read a name. Upload a clearer photo or enter the name manually.
                  </Callout>
                  <Button variant="secondary" onClick={openUploadModal}>
                    <span className="inline-flex items-center gap-2">
                      <FiRefreshCw className="h-4 w-4" />
                      Re-extract
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-card-border bg-background p-6 text-center space-y-4">
              <p className="text-sm text-card-text">
                Upload a CNIC or government ID. We&apos;ll extract the legal name automatically.
              </p>
              <Button variant="primary" onClick={openUploadModal} className="mx-auto">
                <span className="inline-flex items-center gap-2">
                  <FiUpload className="h-4 w-4" />
                  Upload ID
                </span>
              </Button>
              <p className="text-xs text-card-text">Use a well-lit photo without glare. JPG or PNG.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-w-lg">
          <Input
            name="manual_legal_name"
            label="Legal name"
            placeholder="e.g. Muhammad Ali Khan"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
          />

          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={onManualContinue}
              isLoading={manualSubmitting}
              disabled={!canManualContinue || manualSubmitting}
              className="w-full sm:w-auto"
            >
              <span className="inline-flex items-center justify-center gap-2">
                Continue <FiArrowRight className="h-4 w-4" />
              </span>
            </Button>
          </div>
        </div>
      )}

      <Modal isOpen={uploadModalOpen} onClose={closeUploadModal}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text">
              {isReextract ? "Re-extract legal name" : "Upload identification"}
            </h2>
            <p className="mt-1 text-sm text-card-text">
              {isReextract
                ? "Upload a new or clearer ID image. The previous file will be replaced."
                : "Upload a CNIC or government ID. The name area should be readable."}
            </p>
          </div>

          {error && uploadModalOpen ? (
            <Callout tone="danger" title="Extraction failed">
              {error}
            </Callout>
          ) : null}

          <FileUploader
            name="cnic-upload-modal"
            accept="image/*"
            multiple={false}
            hint="CNIC or government ID — JPG or PNG, name area readable"
            resetWhen={uploadModalOpen}
            uploadButtonLabel={isReextract ? "Re-extract" : "Extract name"}
            uploadFile={uploadIdentity}
            onFilesChange={handleFilesChange}
            onAllComplete={() => {
              onIdentityUploaded?.();
              setUploadModalOpen(false);
            }}
            onUploadError={(errors) => {
              onUploadError?.(errors[0]?.error || "Upload failed.");
            }}
            footer={
              <Button variant="secondary" onClick={closeUploadModal}>
                Cancel
              </Button>
            }
          />

          {localPreviewUrl ? (
            <div className="overflow-hidden rounded-lg border border-card-border">
              <img src={localPreviewUrl} alt="ID preview" className="max-h-48 w-full object-contain bg-card" />
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

export default Step1IdentityUpload;
