import React, { useMemo, useState } from "react";
import { SubmissionDocument } from "../../types/extraction.types";
import Modal from "../Reusable/Modal";
import ExtractedFieldsGrid from "./ExtractedFieldsGrid";
import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import ActionBar from "../Reusable/ActionBar";
import Callout from "../Reusable/Callout";
import StatusBadge from "../Reusable/StatusBadge";
import Card from "../Reusable/Card";
import { DocumentUploaderMeta } from "../Reusable/UserActionAvatar";
import { prettyDate } from "../../utils/date";
import Button from "../Reusable/Button";
import IconButton from "../Reusable/IconButton";
import FileUploadZone from "../Reusable/Inputs/FileUploadZone";
import {
  FiFileText,
  FiRefreshCw,
  FiTrash2,
  FiPlus,
  FiX,
  FiExternalLink,
} from "react-icons/fi";
import {
  extractedFieldCount,
  fileKindIcon,
  formatBytes,
  getFileName,
  getFileRef,
  getFileUrl,
  sortDocumentsNewestFirst,
} from "./clientDocumentUtils";

export type ClientDocumentsPanelProps = {
  clientTitle?: string;
  clientLegalName?: string | null;
  docFiles: File[];
  loading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveDocFile?: (index: number) => void;
  onSubmit: () => Promise<boolean>;
  onBack?: () => void;
  existingDocuments: SubmissionDocument[];
  onReplaceExisting: (docEntryId: string, file: File) => Promise<void>;
  onDeleteExisting: (docEntryId: string) => Promise<void>;
};

const ClientDocumentsPanel: React.FC<ClientDocumentsPanelProps> = ({
  clientTitle,
  clientLegalName,
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
  const [addOpen, setAddOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceForId, setReplaceForId] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteForId, setDeleteForId] = useState<string | null>(null);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [fieldsForId, setFieldsForId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const sortedDocs = useMemo(
    () => sortDocumentsNewestFirst(existingDocuments),
    [existingDocuments]
  );

  const selectedDoc = useMemo(() => {
    if (!fieldsForId) return null;
    return sortedDocs.find((d) => d?._id === fieldsForId) || null;
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
          icon={FiX as React.ComponentType<{ className?: string }>}
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

  const description = clientTitle ? (
    <>
      <span className="font-medium text-text">{clientTitle}</span>
      {clientLegalName && clientLegalName !== clientTitle ? (
        <span className="text-card-text"> · {clientLegalName}</span>
      ) : null}
      <span className="text-card-text"> — upload, review, and manage all client documents in one place.</span>
    </>
  ) : (
    "Upload documents to extract fields. View, replace, or remove files below."
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client documents"
        description={description}
      />

      <ActionBar
        left={
          onBack ? (
            <Button variant="secondary" type="button" onClick={onBack}>
              Back
            </Button>
          ) : null
        }
        right={
          <Button variant="primary" type="button" onClick={() => setAddOpen(true)}>
            <span className="inline-flex items-center gap-2">
              <FiPlus /> Upload documents
            </span>
          </Button>
        }
      />

      <Surface variant="soft" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-text">All files</h2>
            <p className="mt-0.5 text-sm text-card-text">
              {sortedDocs.length === 0
                ? "No documents uploaded yet."
                : `${sortedDocs.length} document${sortedDocs.length === 1 ? "" : "s"} on file`}
            </p>
          </div>
          {sortedDocs.length > 0 ? <StatusBadge tone="neutral">{sortedDocs.length} total</StatusBadge> : null}
        </div>

        {sortedDocs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-card-border bg-card/40 px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FiFileText className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-semibold text-text">No documents yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-card-text">
              Upload PDFs, Word files, or images to extract fields and build the client profile.
            </p>
            <Button variant="primary" type="button" className="mt-5" onClick={() => setAddOpen(true)}>
              <span className="inline-flex items-center gap-2">
                <FiPlus /> Upload documents
              </span>
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedDocs.map((doc) => {
              const id = doc._id as string;
              const file = getFileRef(doc);
              const name = getFileName(doc, file);
              const url = getFileUrl(file);
              const fieldCount = extractedFieldCount(doc);
              const isBusy = actionLoadingId === id;
              const uploadedAt = doc.uploadDate || file?.uploaded_at || file?.createdAt;
              const ext = file?.extension ? String(file.extension).replace(/^\./, "").toUpperCase() : "FILE";
              const rawDocType = doc.document_type?.trim() || null;
              const docType = rawDocType && !rawDocType.includes("/") ? rawDocType : null;
              const Icon = fileKindIcon(file?.content_type, file?.extension);

              return (
                <Card key={id} containerClassName="h-full">
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm">
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-text" title={name}>
                          {name}
                        </h3>
                        <DocumentUploaderMeta
                          uploadedBy={file?.uploaded_by}
                          tooltipUploadedAt={file?.uploaded_at}
                          uploadDate={doc.uploadDate}
                          createdAt={file?.createdAt}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StatusBadge tone="neutral">{ext}</StatusBadge>
                          {docType ? <StatusBadge tone="primary">{docType}</StatusBadge> : null}
                        </div>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-xl border border-card-border bg-background/60 px-3 py-2.5 text-xs">
                      <div>
                        <dt className="text-card-text">Uploaded</dt>
                        <dd className="font-medium text-text">{uploadedAt ? prettyDate(uploadedAt) : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-card-text">Size</dt>
                        <dd className="font-medium text-text">{formatBytes(file?.size_in_bytes)}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-card-text">Extracted fields</dt>
                        <dd>
                          <button
                            type="button"
                            className="font-semibold text-primary underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow"
                            onClick={() => openFieldsModal(id)}
                            disabled={isBusy || fieldCount === 0}
                          >
                            {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                            {fieldCount > 0 ? " — View" : ""}
                          </button>
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-card-border pt-3">
                      {url ? (
                        <Button
                          variant="primary"
                          type="button"
                          className="min-w-0 flex-1 sm:flex-none"
                          disabled={isBusy}
                          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                        >
                          <span className="inline-flex items-center gap-2">
                            <FiExternalLink className="h-4 w-4 shrink-0" />
                            Open file
                          </span>
                        </Button>
                      ) : (
                        <span className="text-xs text-card-text">Download link unavailable</span>
                      )}

                      <div className="ml-auto flex items-center gap-1">
                        <IconButton
                          icon={FiFileText as React.ComponentType<{ className?: string }>}
                          size="sm"
                          outline
                          fillBg
                          hoverable
                          title="View extracted fields"
                          disabled={isBusy || fieldCount === 0}
                          onClick={() => openFieldsModal(id)}
                        />
                        <IconButton
                          icon={FiRefreshCw as React.ComponentType<{ className?: string }>}
                          size="sm"
                          outline
                          fillBg
                          hoverable
                          title="Replace document"
                          disabled={isBusy}
                          onClick={() => openReplaceModal(id)}
                        />
                        <IconButton
                          icon={FiTrash2 as React.ComponentType<{ className?: string }>}
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
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Surface>

      <Modal isOpen={addOpen} onClose={() => !loading && setAddOpen(false)}>
        <div className="space-y-4">
          <PageHeader title="Upload documents" description="Select files, then extract fields." />
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
                  Extract fields
                </Button>
              </>
            }
          />
        </div>
      </Modal>

      <Modal isOpen={replaceOpen} onClose={closeReplace}>
        <div className="space-y-4">
          <PageHeader
            title="Replace document"
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
                  Confirm replace
                </Button>
              </>
            }
          />
        </div>
      </Modal>

      <Modal isOpen={deleteOpen} onClose={closeDelete}>
        <div className="space-y-4">
          <PageHeader
            title="Delete document?"
            description="This will remove the document and its extracted fields permanently and may affect eligibility."
          />
          <Callout tone="danger" title="Warning">
            This action can&apos;t be undone.
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
                  Confirm delete
                </Button>
              </>
            }
          />
        </div>
      </Modal>

      <Modal isOpen={fieldsOpen} onClose={closeFields}>
        <div className="space-y-4">
          <PageHeader
            title="Extracted fields"
            description={
              selectedDoc ? (
                <>
                  <span className="font-semibold text-text">
                    {getFileName(selectedDoc, getFileRef(selectedDoc))}
                  </span>
                  <span className="text-card-text"> · </span>
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
            <Surface variant="soft" className="max-h-[70vh] overflow-auto p-4">
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

export default ClientDocumentsPanel;
