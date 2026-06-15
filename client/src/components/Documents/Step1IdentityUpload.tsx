import React, { useEffect, useMemo, useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import Input from "../Reusable/Inputs/Input";
import FileUploadZone from "../Reusable/Inputs/FileUploadZone";
import Button from "../Reusable/Button";
import Callout from "../Reusable/Callout";
import { cn } from "../../utils/cn";

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

      {error ? (
        <Callout tone="danger" title="Something went wrong">
          {error}
        </Callout>
      ) : null}

      {mode === "upload" ? (
        <div className="space-y-4">
          <FileUploadZone
            name="cnic-upload"
            accept="image/*"
            disabled={loading}
            hint="CNIC or government ID — JPG or PNG, name area readable"
            selectedFileName={cnicFile?.name ?? null}
            onChange={onFileChange}
          />

          {extractedState === "found" ? (
            <p className="text-sm text-card-text">
              Extracted legal name:{" "}
              <span className="font-semibold text-text">{cnicName}</span>
            </p>
          ) : null}

          {extractedState === "notfound" ? (
            <p className="text-sm text-warning">
              We couldn&apos;t detect a name from this image. Try a clearer photo or switch to
              manual entry.
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-card-text">
              Use a well-lit photo without glare.
            </p>
            <Button
              variant="primary"
              onClick={onSubmit}
              isLoading={loading}
              disabled={!cnicFile || loading}
              className="w-full sm:w-auto"
            >
              <span className="inline-flex items-center justify-center gap-2">
                Extract & continue <FiArrowRight className="h-4 w-4" />
              </span>
            </Button>
          </div>
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
              isLoading={loading}
              disabled={!canManualContinue || loading}
              className="w-full sm:w-auto"
            >
              <span className="inline-flex items-center justify-center gap-2">
                Continue <FiArrowRight className="h-4 w-4" />
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step1IdentityUpload;
