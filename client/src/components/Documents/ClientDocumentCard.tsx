import type { IconType } from "react-icons";
import type { FileRef } from "../../types/extraction.types";
import Card from "../Reusable/Card";
import StatusBadge, { type StatusBadgeTone } from "../Reusable/StatusBadge";
import IconButton from "../Reusable/IconButton";
import { DocumentActorMeta } from "../Reusable/UserActionAvatar";
import type { UserActionVerb } from "../Reusable/UserActionAvatar";
import DocumentFileThumbnail from "./DocumentFileThumbnail";
import { formatBytes } from "./clientDocumentUtils";

export type DocumentCardBadge = {
  label: string;
  tone: StatusBadgeTone;
};

export type DocumentCardFooterAction = {
  key: string;
  icon: IconType;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

export type ClientDocumentCardProps = {
  file: FileRef | null;
  fileName: string;
  badges?: DocumentCardBadge[];
  actor?: {
    user: FileRef["uploaded_by"];
    verb: UserActionVerb;
    timestamp?: string | Date | null;
  };
  sizeInBytes?: number | null;
  errorMessage?: string | null;
  disabled?: boolean;
  footerStartActions?: DocumentCardFooterAction[];
  footerEndActions?: DocumentCardFooterAction[];
};

export default function ClientDocumentCard({
  file,
  fileName,
  badges = [],
  actor,
  sizeInBytes,
  errorMessage,
  disabled = false,
  footerStartActions = [],
  footerEndActions = [],
}: ClientDocumentCardProps) {
  const ext = file?.extension ? String(file.extension).replace(/^\./, "").toUpperCase() : "FILE";
  const hasFooter = footerStartActions.length > 0 || footerEndActions.length > 0;

  return (
    <Card containerClassName="h-full min-w-0" className="!p-0 overflow-hidden">
      <div className="flex h-full min-w-0 flex-col">
        <DocumentFileThumbnail
          file={file}
          fileName={fileName}
          disabled={disabled}
          variant="hero"
          formatLabel={ext}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="min-w-0 space-y-2">
            <h3
              className="line-clamp-2 break-words text-base font-semibold leading-snug text-text"
              title={fileName}
            >
              {fileName}
            </h3>

            {actor ? (
              <DocumentActorMeta user={actor.user} verb={actor.verb} timestamp={actor.timestamp} />
            ) : null}

            <p className="text-xs text-card-text">{formatBytes(sizeInBytes ?? file?.size_in_bytes)}</p>

            {badges.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {badges.map((badge) => (
                  <StatusBadge key={badge.label} tone={badge.tone}>
                    {badge.label}
                  </StatusBadge>
                ))}
              </div>
            ) : null}

            {errorMessage ? <p className="text-xs text-danger">{errorMessage}</p> : null}
          </div>

          {hasFooter ? (
            <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-card-border pt-3">
              {footerStartActions.map((action) => (
                <IconButton
                  key={action.key}
                  icon={action.icon}
                  size="sm"
                  outline
                  fillBg
                  hoverable
                  title={action.title}
                  disabled={disabled || action.disabled}
                  isLoading={action.isLoading}
                  onClick={action.onClick}
                />
              ))}

              {footerEndActions.length > 0 ? (
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  {footerEndActions.map((action) => (
                    <IconButton
                      key={action.key}
                      icon={action.icon}
                      size="sm"
                      outline
                      fillBg
                      hoverable
                      title={action.title}
                      disabled={disabled || action.disabled}
                      isLoading={action.isLoading}
                      onClick={action.onClick}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
