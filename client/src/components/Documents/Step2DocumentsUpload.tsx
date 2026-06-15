import React, { useMemo, useState } from "react";
import { SubmissionDocument, FileRef } from "../../types/extraction.types";
import Modal from "../Reusable/Modal";
import ExtractedFieldsGrid from "./ExtractedFieldsGrid";

import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import ActionBar from "../Reusable/ActionBar";
import Callout from "../Reusable/Callout";
import StatusBadge from "../Reusable/StatusBadge";
import Card from "../Reusable/Card";
import { DocumentUploaderMeta } from "../Reusable/UserActionAvatar";
import { resolveFileUrl } from "../../utils/fileUrl";
import { prettyDate } from "../../utils/date";

import Button from "../Reusable/Button";
import IconButton from "../Reusable/IconButton";
import FileUploadZone from "../Reusable/Inputs/FileUploadZone";

import { FiFile, FiFileText, FiImage, FiEye, FiRefreshCw, FiTrash2, FiPlus, FiX } from "react-icons/fi";
import type { IconType } from "react-icons";

export type Step2Props = {
  docFiles: File[];
  loading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveDocFile?: (index: number) => void;
  onSubmit: () => Promise<boolean>;
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
  return resolveFileUrl(fileRef.url || null);
};

const formatBytes = (bytes?: number | null): string => {
  if (bytes == null || bytes < 0 || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${u === 0 ? Math.round(v) : v.toFixed(v >= 10 || u === 0 ? 0 : 1)} ${units[u]}`;
};

const fileKindIcon = (contentType?: string | null, ext?: string | null): IconType => {
  const ct = (contentType || "").toLowerCase();
  const e = (ext || "").toLowerCase().replace(/^\./, "");
  if (ct.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "tif", "tiff", "heic"].includes(e)) {
    return FiImage;
  }
  if (ct.includes("pdf") || e === "pdf") return FiFileText;
  return FiFile;
};

const getPopulatedFileRef = (fileRef: FileRef): FileRef | null => {
  if (!fileRef || typeof fileRef === "string") return null;
  return fileRef;
};

const Step2DocumentsUpload: React.FC<Step2Props> = ({
  docFiles,
  loading,
  onFileChange,
  onRemoveDocFile,
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

  const handleExtract = async () => {
    const success = await onSubmit();
    if (success) setAddOpen(false);
  };

  const renderPendingFileRow = (file: File, index: number) => (
    <div
      key={`${file.name}-${index}`}
      className="flex items-center justify-between gap-3 border-b border-card-border py-2 last:border-0"
    >
      <div className="flex min-w-0 items-center gap-2">
        <FiFileText className="h-4 w-4 shrink-0 text-card-text" />
        <span className="truncate text-sm text-text">{file.name}</span>
      </div>

      {onRemoveDocFile ? (
        <IconButton
          icon={FiX as any}
          size="sm"
          outline={false}
          fillBg={false}
          hoverable
          title="Remove"
          disabled={loading}
          onClick={() => onRemoveDocFile(index)}
        />
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Step 2: Upload Documents"
        description="Upload documents to extract fields. Manage uploaded files below."
      />

      <ActionBar
        left={
          <Button variant="secondary" type="button" onClick={onBack}>
            Back
          </Button>
        }
        right={
          <Button variant="primary" type="button" onClick={() => setAddOpen(true)}>
            <span className="inline-flex items-center gap-2">
              <FiPlus /> Upload Documents
            </span>
          </Button>
        }
      />

      <Surface variant="soft" className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-extrabold text-text">Uploaded Documents</div>
          <StatusBadge tone="neutral">{sortedDocs.length}</StatusBadge>
        </div>

        {sortedDocs.length === 0 ? (
          <div className="mt-4">
            <Callout tone="info">
              No documents yet. Click <span className="font-semibold text-text">Upload Documents</span> to get started.
            </Callout>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedDocs.map((d: any) => {
              const id = d?._id as string;
              const file = getPopulatedFileRef(d.document);
              const name = getFileName(d.document);
              const url = getFileUrl(d.document);
              const extractedCount = Array.isArray(d.extracted_fields) ? d.extracted_fields.length : 0;
              const isBusy = actionLoadingId === id;
              const uploadedAt = d.uploadDate || file?.uploaded_at || file?.createdAt;
              const ext = file?.extension ? String(file.extension).replace(/^\./, "").toUpperCase() : "FILE";
              const Icon = fileKindIcon(file?.content_type, file?.extension);

              return (
                <Card key={id} containerClassName="h-full">
                  <div className="flex h-full flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-card-border bg-background text-primary">
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-text" title={name}>
                          {name}
                        </h3>
                        <DocumentUploaderMeta
                          uploadedBy={file?.uploaded_by}
                          tooltipUploadedAt={file?.uploaded_at}
                          uploadDate={d.uploadDate}
                          createdAt={file?.createdAt}
                        />
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-card-text">{ext}</p>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-card-border pt-3 text-xs">
                      <div>
                        <dt className="text-card-text">Fields</dt>
                        <dd>
                          <StatusBadge tone={extractedCount > 0 ? "success" : "warning"}>
                            {extractedCount}
                          </StatusBadge>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-card-text">Uploaded</dt>
                        <dd className="font-medium text-text">{uploadedAt ? prettyDate(uploadedAt) : "—"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-card-text">Size</dt>
                        <dd className="font-medium text-text">{formatBytes(file?.size_in_bytes)}</dd>
                      </div>
                    </dl>

                    <div className="mt-auto flex items-center justify-end gap-1 border-t border-card-border pt-3">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer">
                          <IconButton
                            icon={FiEye as any}
                            size="sm"
                            outline
                            fillBg
                            hoverable
                            title="View document"
                            disabled={isBusy}
                          />
                        </a>
                      ) : (
                        <IconButton
                          icon={FiEye as any}
                          size="sm"
                          outline
                          fillBg
                          hoverable
                          title="Document URL unavailable"
                          disabled
                        />
                      )}

                      <IconButton
                        icon={FiFileText as any}
                        size="sm"
                        outline
                        fillBg
                        hoverable
                        title="View extracted fields"
                        disabled={isBusy || extractedCount === 0}
                        onClick={() => openFieldsModal(id)}
                      />

                      <IconButton
                        icon={FiRefreshCw as any}
                        size="sm"
                        outline
                        fillBg
                        hoverable
                        title="Replace document"
                        disabled={isBusy}
                        onClick={() => openReplaceModal(id)}
                      />

                      <IconButton
                        icon={FiTrash2 as any}
                        size="sm"
                        outline
                        fillBg
                        hoverable
                        title="Delete document"
                        disabled={isBusy}
                        onClick={() => openDeleteModal(id)}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Surface>

      {/* ===================== MODALS ===================== */}

      {/* Upload & extract modal */}
      <Modal isOpen={addOpen} onClose={() => !loading && setAddOpen(false)}>
        <div className="space-y-4">
          <PageHeader
            title="Upload Documents"
            description="Select files, then extract fields."
          />

          <FileUploadZone
            name="add-documents"
            multiple
            accept=".pdf,.docx,image/*"
            hint="PDF, DOCX, or images"
            onChange={onFileChange}
          />

          {docFiles.length > 0 ? (
            <div className="rounded-xl border border-card-border px-3">
              {docFiles.map((file, index) => renderPendingFileRow(file, index))}
            </div>
          ) : null}

          <ActionBar
            right={
              <>
                <Button variant="secondary" type="button" disabled={loading} onClick={() => setAddOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleExtract}
                  isLoading={loading}
                  disabled={loading || docFiles.length === 0}
                >
                  Extract Fields
                </Button>
              </>
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

          <Surface variant="soft" className="p-4">
            <FileUploadZone
              name="replace-document"
              accept=".pdf,.docx,image/*"
              hint="PDF, DOCX, or image"
              selectedFileName={replaceFile?.name ?? null}
              onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
            />
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
