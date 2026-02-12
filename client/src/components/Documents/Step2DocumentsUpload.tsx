import React, { useMemo, useState } from "react";
import { SubmissionDocument, FileRef } from "../../types/extraction.types";
import Modal from "../Reusable/Modal";
import ExtractedFieldsGrid from "./ExtractedFieldsGrid";

import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import ActionBar from "../Reusable/ActionBar";
import FileList from "../Reusable/FileList";
import Callout from "../Reusable/Callout";
import StatusBadge from "../Reusable/StatusBadge";
import Avatar from "../Reusable/Avatar";
import { timeAgo } from "../../utils/date";
import { getUserDisplayName, normalizeUserForAvatar } from "../../utils/userUtils";
import { BACKEND_URL } from "../../constants/env.constants";

import Button from "../Reusable/Button";
import IconButton from "../Reusable/IconButton";

import { FiFileText, FiEye, FiRefreshCw, FiTrash2, FiPlus } from "react-icons/fi";

export type Step2Props = {
  docFiles: File[];
  loading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onBack: () => void;
  existingDocuments: SubmissionDocument[];
  onReplaceExisting: (docEntryId: string, file: File) => Promise<void>;
  onDeleteExisting: (docEntryId: string) => Promise<void>;
};

const getFileName = (fileRef: FileRef): string => {
  if (!fileRef) return "Document";
  if (typeof fileRef === "string") return "Document";
  return fileRef.display_name || fileRef.original_name || "Document";
};

const getFileUrl = (fileRef: FileRef): string | null => {
  if (!fileRef || typeof fileRef === "string") return null;
  return fileRef.url || null;
};

const Step2DocumentsUpload: React.FC<Step2Props> = ({
  docFiles,
  loading,
  onFileChange,
  onSubmit,
  onBack,
  existingDocuments,
  onReplaceExisting,
  onDeleteExisting,
}) => {
  // ---- modal state ----
  const [addOpen, setAddOpen] = useState(false);

  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceForId, setReplaceForId] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteForId, setDeleteForId] = useState<string | null>(null);

  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [fieldsForId, setFieldsForId] = useState<string | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const sortedDocs = useMemo(() => {
    const arr = Array.isArray(existingDocuments) ? [...existingDocuments] : [];
    return arr.sort((a: any, b: any) => {
      const da = a?.uploadDate ? new Date(a.uploadDate).getTime() : 0;
      const db = b?.uploadDate ? new Date(b.uploadDate).getTime() : 0;
      return db - da;
    });
  }, [existingDocuments]);

  const selectedDoc = useMemo(() => {
    if (!fieldsForId) return null;
    return (sortedDocs as any[]).find((d) => d?._id === fieldsForId) || null;
  }, [fieldsForId, sortedDocs]);

  const openReplaceModal = (id: string) => {
    setReplaceForId(id);
    setReplaceFile(null);
    setReplaceOpen(true);
  };

  const openDeleteModal = (id: string) => {
    setDeleteForId(id);
    setDeleteOpen(true);
  };

  const openFieldsModal = (id: string) => {
    setFieldsForId(id);
    setFieldsOpen(true);
  };

  const doReplace = async () => {
    if (!replaceForId || !replaceFile) return;
    try {
      setActionLoadingId(replaceForId);
      await onReplaceExisting(replaceForId, replaceFile);
      setReplaceOpen(false);
      setReplaceForId(null);
      setReplaceFile(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  const doDelete = async () => {
    if (!deleteForId) return;
    try {
      setActionLoadingId(deleteForId);
      await onDeleteExisting(deleteForId);
      setDeleteOpen(false);
      setDeleteForId(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  const closeReplace = () => {
    setReplaceOpen(false);
    setReplaceForId(null);
    setReplaceFile(null);
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteForId(null);
  };

  const closeFields = () => {
    setFieldsOpen(false);
    setFieldsForId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Step 2: Upload Documents"
        description="Upload documents for extraction. You can manage previously uploaded documents below."
        right={
          <>
            <StatusBadge tone="neutral">
              New selected: <span className="ml-1 text-text">{docFiles?.length || 0}</span>
            </StatusBadge>

            <Button variant="secondary" type="button" onClick={() => setAddOpen(true)}>
              <span className="inline-flex items-center gap-2">
                <FiPlus /> Add Documents
              </span>
            </Button>

            <Button
              variant="primary"
              type="button"
              onClick={onSubmit}
              isLoading={loading}
              disabled={loading}
            >
              Extract Fields
            </Button>
          </>
        }
      />

      {/* Back */}
      <ActionBar
        left={
          <Button variant="secondary" type="button" onClick={onBack}>
            Back
          </Button>
        }
      />

      {/* Uploaded documents list */}
      <Surface variant="soft" className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-extrabold text-text">Uploaded Documents</div>
            <div className="mt-1 text-sm text-card-text">
              Replace updates extracted fields for that document. Delete removes it completely.
            </div>
          </div>

          <StatusBadge tone="neutral">{sortedDocs.length} document(s)</StatusBadge>
        </div>

        {sortedDocs.length === 0 ? (
          <div className="mt-4">
            <Callout tone="info" title="No documents yet">
              Upload your first document using <span className="font-semibold text-text">Add Documents</span>.
            </Callout>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {sortedDocs.map((d: any) => {
              const id = d?._id as string;
              const name = getFileName(d.document);
              const url = getFileUrl(d.document);
              const extractedCount = Array.isArray(d.extracted_fields) ? d.extracted_fields.length : 0;
              
              // Get uploader info
              const uploaderInfo = d.document?.uploaded_by;
              const uploaderName = uploaderInfo ? getUserDisplayName(uploaderInfo) : null;
              const uploadedAtTimeAgo = d.document?.uploaded_at ? timeAgo(d.document.uploaded_at) : null;

              const isBusy = actionLoadingId === id;

              return (
                <Surface key={id} variant="card" className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-card-border bg-background">
                          <FiFileText />
                        </span>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-text">{name}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-card-text">
                            {uploaderInfo ? (
                              <Avatar
                                user={normalizeUserForAvatar(uploaderInfo, BACKEND_URL)}
                                size="xs"
                                showTooltip={true}
                                tooltipText={`Uploaded by ${uploaderName || "Unknown"}${uploadedAtTimeAgo ? ` ${uploadedAtTimeAgo}` : ""}`}
                              />
                            ) : (
                              <span className="text-card-text">by Unknown</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={extractedCount > 0 ? "success" : "warning"}>
                          Fields: {extractedCount}
                        </StatusBadge>

                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-text underline"
                          >
                            Open
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <IconButton
                        icon={FiEye as any}
                        size="md"
                        outline
                        fillBg
                        hoverable
                        title="View extracted fields"
                        disabled={isBusy || extractedCount === 0}
                        onClick={() => openFieldsModal(id)}
                      />

                      <IconButton
                        icon={FiRefreshCw as any}
                        size="md"
                        outline
                        fillBg
                        hoverable
                        title="Replace document"
                        disabled={isBusy}
                        onClick={() => openReplaceModal(id)}
                      />

                      <IconButton
                        icon={FiTrash2 as any}
                        size="md"
                        outline
                        fillBg
                        hoverable
                        title="Delete document"
                        disabled={isBusy}
                        onClick={() => openDeleteModal(id)}
                      />
                    </div>
                  </div>
                </Surface>
              );
            })}
          </div>
        )}
      </Surface>

      {/* ===================== MODALS ===================== */}

      {/* Add Documents Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          <PageHeader
            title="Add Documents"
            description={
              <>
                Upload new documents (PDF / DOCX / Images). After selecting, click{" "}
                <span className="font-semibold text-text">Extract Fields</span>.
              </>
            }
          />

          <Surface variant="soft" className="p-4">
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,image/*"
              onChange={onFileChange}
              className="text-sm text-card-text"
            />
          </Surface>

          <FileList title="Selected" files={docFiles || []} />

          <ActionBar
            right={
              <Button variant="secondary" type="button" onClick={() => setAddOpen(false)}>
                Done
              </Button>
            }
          />
        </div>
      </Modal>

      {/* Replace Modal */}
      <Modal isOpen={replaceOpen} onClose={closeReplace}>
        <div className="space-y-4">
          <PageHeader
            title="Replace Document"
            description="Select a new file to replace this document. Extracted fields will be updated."
          />

          <Surface variant="soft" className="p-4 space-y-3">
            <input
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
              className="text-sm text-card-text"
            />

            {replaceFile ? (
              <Callout tone="info" title="Selected file">
                <span className="font-semibold text-text">{replaceFile.name}</span>
              </Callout>
            ) : null}
          </Surface>

          <ActionBar
            right={
              <>
                <Button variant="secondary" type="button" disabled={!!actionLoadingId} onClick={closeReplace}>
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  type="button"
                  disabled={!replaceFile || !!actionLoadingId}
                  isLoading={!!actionLoadingId}
                  onClick={doReplace}
                >
                  Confirm Replace
                </Button>
              </>
            }
          />
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={deleteOpen} onClose={closeDelete}>
        <div className="space-y-4">
          <PageHeader
            title="Delete Document?"
            description="This will remove the document and its extracted fields permanently and may affect eligibility."
          />

          <Callout tone="danger" title="Warning">
            This action can’t be undone.
          </Callout>

          <ActionBar
            right={
              <>
                <Button variant="secondary" type="button" disabled={!!actionLoadingId} onClick={closeDelete}>
                  Cancel
                </Button>

                <Button
                  variant="danger"
                  type="button"
                  disabled={!!actionLoadingId}
                  isLoading={!!actionLoadingId}
                  onClick={doDelete}
                >
                  Confirm Delete
                </Button>
              </>
            }
          />
        </div>
      </Modal>

      {/* View Fields Modal */}
      <Modal isOpen={fieldsOpen} onClose={closeFields}>
        <div className="space-y-4">
          <PageHeader
            title="Extracted Fields"
            description={
              selectedDoc ? (
                <>
                  <span className="font-semibold text-text">{getFileName(selectedDoc.document)}</span>
                  <span className="text-card-text"> • </span>
                  <span className="text-card-text">
                    {selectedDoc.uploadDate ? new Date(selectedDoc.uploadDate).toLocaleString() : "—"}
                  </span>
                </>
              ) : (
                "No document selected."
              )
            }
          />

          {selectedDoc ? (
            <Surface variant="soft" className="p-4 max-h-[70vh] overflow-auto">
              <ExtractedFieldsGrid
                fields={selectedDoc.extracted_fields || []}
                emptyText="No extracted fields for this document."
              />
            </Surface>
          ) : (
            <Callout tone="warning">No document selected.</Callout>
          )}

          <ActionBar
            right={
              <Button variant="secondary" type="button" onClick={closeFields}>
                Close
              </Button>
            }
          />
        </div>
      </Modal>
    </div>
  );
};

export default Step2DocumentsUpload;
