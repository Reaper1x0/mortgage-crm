// src/components/document-extraction/Step1IdentityUpload.tsx
import React, { useEffect, useMemo, useState } from "react";
import { FiEdit3, FiArrowRight, FiFileText, FiUploadCloud } from "react-icons/fi";
import Input from "../Reusable/Inputs/Input";
import FileUploadZone from "../Reusable/Inputs/FileUploadZone";
import Button from "../Reusable/Button";
import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import Segmented from "../Reusable/Segmented";
import Callout from "../Reusable/Callout";
import StatusBadge from "../Reusable/StatusBadge";

export type Step1Props = {
  cnicFile: File | null;
  cnicName: string | null;
  loading: boolean;
  error: string | null;

  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;

  manualName: string;
  setManualName: (v: string) => void;
  onManualContinue: () => void;
};

const Step1IdentityUpload: React.FC<Step1Props> = ({
  cnicFile,
  cnicName,
  loading,
  error,
  onFileChange,
  onSubmit,
  manualName,
  setManualName,
  onManualContinue,
}) => {
  const [mode, setMode] = useState<"upload" | "manual">("upload");

  useEffect(() => {
    if (cnicName) setMode("upload");
  }, [cnicName]);

  const canManualContinue = manualName.trim().length >= 3;

  const extractedState = useMemo(() => {
    if (cnicName === null) return "idle";
    if (!cnicName) return "notfound";
    return "found";
  }, [cnicName]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Step 1: Provide Legal Name"
        description="Choose one option: extract the legal name from an ID document, or enter it manually."
      />

      <div className="w-full">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            {
              key: "upload",
              label: "Upload ID & Extract",
              description: "Upload a clear CNIC/ID image to detect the legal name automatically.",
              icon: <FiUploadCloud className="h-5 w-5 text-text" />,
            },
            {
              key: "manual",
              label: "Enter Manually",
              description: "Type the legal name if upload isn't available or name isn't detected.",
              icon: <FiEdit3 className="h-5 w-5 text-text" />,
            },
          ]}
        />
      </div>

      {error ? (
        <Callout tone="danger" title="Something went wrong">
          {error}
        </Callout>
      ) : null}

      {mode === "upload" && (
        <Surface className="p-4 sm:p-5 md:p-6" variant="card">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="rounded-3xl border border-card-border bg-background p-4 sm:p-5 space-y-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border border-card-border bg-card">
                  <FiFileText className="h-5 w-5 text-text" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-text">Identification document</div>
                  <div className="mt-1 text-sm text-card-text">
                    Upload an image (CNIC/ID). Make sure the name area is sharp and readable.
                  </div>
                </div>
              </div>

              <FileUploadZone
                name="cnic-upload"
                accept="image/*"
                disabled={loading}
                hint="CNIC or government ID image — JPG or PNG recommended"
                selectedFileName={cnicFile?.name ?? null}
                onChange={onFileChange}
              />

              <StatusBadge tone={cnicFile ? "primary" : "neutral"}>
                {cnicFile ? "File selected" : "No file selected"}
              </StatusBadge>
            </div>

            {cnicName !== null ? (
              extractedState === "found" ? (
                <Callout tone="success" title="Extracted legal name">
                  <span className="font-semibold text-text break-words">{cnicName}</span>
                </Callout>
              ) : (
                <Callout tone="warning" title="Name not found">
                  We couldn't detect a legal name from this image. Try a clearer photo or use manual entry.
                </Callout>
              )
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="primary"
                onClick={onSubmit}
                isLoading={loading}
                disabled={!cnicFile || loading}
                className="w-full sm:w-auto"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  Extract Name & Continue <FiArrowRight />
                </span>
              </Button>
            </div>

            <div className="text-xs text-card-text">
              Tip: Use a well-lit photo with no glare. Crop close to the name area if possible.
            </div>
          </div>
        </Surface>
      )}

      {mode === "manual" && (
        <Surface className="p-4 sm:p-5 md:p-6" variant="card">
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-3xl border border-card-border bg-background p-4 sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border border-card-border bg-card">
                  <FiEdit3 className="h-5 w-5 text-text" />
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-bold text-text">Enter the legal name</div>
                  <div className="mt-1 text-sm text-card-text">
                    Use the full legal name exactly as it appears on official documents.
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Input
                  name="manual_legal_name"
                  label="Legal Name"
                  placeholder="e.g. Muhammad Ali Khan"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone={canManualContinue ? "success" : "neutral"}>
                  {canManualContinue ? "Looks good" : "Enter at least 3 characters"}
                </StatusBadge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end">
              <Button
                variant="primary"
                onClick={onManualContinue}
                isLoading={loading}
                disabled={!canManualContinue || loading}
                className="w-full sm:w-auto"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  Continue <FiArrowRight />
                </span>
              </Button>
            </div>
          </div>
        </Surface>
      )}
    </div>
  );
};

export default Step1IdentityUpload;
