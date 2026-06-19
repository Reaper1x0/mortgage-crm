import React, { useMemo, useState } from "react";
import { SubmissionDocument } from "../../types/extraction.types";
import Modal from "../Reusable/Modal";
import ExtractedFieldsGrid from "./ExtractedFieldsGrid";
import ClientDocumentCard from "./ClientDocumentCard";
import UploadProgressRow from "./UploadProgressRow";
import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import ActionBar from "../Reusable/ActionBar";
import Callout from "../Reusable/Callout";
import StatusBadge from "../Reusable/StatusBadge";
import Button from "../Reusable/Button";
import IconButton from "../Reusable/IconButton";
import FileUploadZone from "../Reusable/Inputs/FileUploadZone";
import type { FileUploadProgress } from "../../service/submissionDocumentService";
import { FiFileText, FiPlus, FiX } from "react-icons/fi";
import { getFileName, getFileRef, sortDocumentsNewestFirst } from "./clientDocumentUtils";

export type ClientDocumentsPanelProps = {
  clientTitle?: string;
  clientLegalName?: string | null;
  existingDocuments: SubmissionDocument[];
  onUploadFiles: (files: File[], onFileProgress: (fileName: string, p: FileUploadProgress) => void) => Promise<boolean>;
  onExtractFields: (docEntryId: string) => Promise<boolean>;
  onReplaceExisting: (
    docEntryId: string,
    file: File,
    onProgress?: (p: FileUploadProgress) => void
  ) => Promise<void>;
  onDeleteExisting: (docEntryId: string) => Promise<void>;
  onBack?: () => void;
  extractingDocId?: string | null;
};

const ClientDocumentsPanel: React.FC<ClientDocumentsPanelProps> = ({
  clientTitle,
  clientLegalName,
  existingDocuments,
  onUploadFiles,
  onExtractFields,
  onReplaceExisting,
  onDeleteExisting,
  onBack,
  extractingDocId = null,
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, FileUploadProgress>>({});

  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceForId, setReplaceForId] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceProgress, setReplaceProgress] = useState<FileUploadProgress | null>(null);

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
    setReplaceProgress(null);
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

  const handlePendingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setPendingFiles(files);
    setUploadProgress({});
    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!pendingFiles.length || uploading) return;
    setUploading(true);
    setUploadProgress({});

    const success = await onUploadFiles(pendingFiles, (fileName, progress) => {
      setUploadProgress((prev) => ({ ...prev, [fileName]: progress }));
    });

    setUploading(false);
    if (success) {
      setPendingFiles([]);
      setUploadProgress({});
      setAddOpen(false);
    }
  };

  const doReplace = async () => {
    if (!replaceForId || !replaceFile) return;
    try {
      setActionLoadingId(replaceForId);
      setReplaceProgress({ fileName: replaceFile.name, phase: "uploading", percent: 0 });
      await onReplaceExisting(replaceForId, replaceFile, (p) => setReplaceProgress(p));
      setReplaceOpen(false);
      setReplaceForId(null);
      setReplaceFile(null);
      setReplaceProgress(null);
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

  const handleExtract = async (docEntryId: string) => {
    await onExtractFields(docEntryId);
  };

  const closeReplace = () => {
    if (actionLoadingId) return;
    setReplaceOpen(false);
    setReplaceForId(null);
    setReplaceFile(null);
    setReplaceProgress(null);
  };

  const closeDelete = () => {
    if (actionLoadingId) return;
    setDeleteOpen(false);
    setDeleteForId(null);
  };

  const closeFields = () => {
    setFieldsOpen(false);
    setFieldsForId(null);
  };

  const closeAdd = () => {
    if (uploading) return;
    setAddOpen(false);
  };

  const description = clientTitle ? (
    <>
      <span className="font-medium text-text">{clientTitle}</span>
      {clientLegalName && clientLegalName !== clientTitle ? (
        <span className="text-card-text"> · {clientLegalName}</span>
      ) : null}
      <span className="text-card-text">
        {" "}
        — upload documents first, then extract fields when you are ready.
      </span>
    </>
  ) : (
    "Upload documents to store originals and prepared text. Extract fields per document when ready."
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client documents"
        description={description}
        back={onBack ? { label: "Back", onClick: onBack } : undefined}
        actions={
          <Button variant="primary" type="button" onClick={() => setAddOpen(true)} disabled={uploading}>
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
          <div className="mt-6 rounded-2xl border border-dashed border-card-border bg-card-muted px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-muted text-primary">
              <FiFileText className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-semibold text-text">No documents yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-card-text">
              Upload PDFs, Word files, or images. Each file is stored with its prepared text before you
              extract fields.
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
              const isBusy = actionLoadingId === id;
              const isExtracting = extractingDocId === id;
              return (
                <ClientDocumentCard
                  key={id}
                  doc={doc}
                  isBusy={isBusy}
                  isExtracting={isExtracting}
                  onExtract={handleExtract}
                  onViewFields={openFieldsModal}
                  onReplace={openReplaceModal}
                  onDelete={openDeleteModal}
                />
              );
            })}
          </div>
        )}
      </Surface>

      <Modal isOpen={addOpen} onClose={closeAdd}>
        <div className="space-y-4">
          <PageHeader
            variant="section"
            title="Upload documents"
            description="Files are stored in S3 with prepared markdown and metadata. Extraction is a separate step."
          />
          <FileUploadZone
            name="add-documents"
            multiple
            accept=".pdf,.docx,image/*"
            hint="PDF, DOCX, or images"
            onChange={handlePendingFileChange}
            disabled={uploading}
          />
          {pendingFiles.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-card-border px-3 py-3">
              {pendingFiles.map((file, index) => {
                const progress = uploadProgress[file.name];
                return (
                  <div key={`${file.name}-${index}`} className="space-y-2">
                    {!progress ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <FiFileText className="h-4 w-4 shrink-0 text-card-text" />
                          <span className="truncate text-sm text-text">{file.name}</span>
                        </div>
                        {!uploading ? (
                          <IconButton
                            icon={FiX}
                            size="sm"
                            outline={false}
                            fillBg={false}
                            hoverable
                            title="Remove"
                            onClick={() => removePendingFile(index)}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <UploadProgressRow progress={progress} />
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
          <ActionBar
            right={
              <>
                <Button variant="secondary" type="button" disabled={uploading} onClick={closeAdd}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleUpload}
                  isLoading={uploading}
                  disabled={uploading || pendingFiles.length === 0}
                >
                  Upload
                </Button>
              </>
            }
          />
        </div>
      </Modal>

      <Modal isOpen={replaceOpen} onClose={closeReplace}>
        <div className="space-y-4">
          <PageHeader
            variant="section"
            title="Replace document"
            description="Upload a new file. Extracted fields and assistant index will need to be run again."
          />
          <Surface variant="soft" className="p-4">
            <FileUploadZone
              name="replace-document"
              accept=".pdf,.docx,image/*"
              hint="PDF, DOCX, or image"
              selectedFileName={replaceFile?.name ?? null}
              disabled={!!actionLoadingId}
              onChange={(e) => {
                setReplaceFile(e.target.files?.[0] || null);
                setReplaceProgress(null);
              }}
            />
          </Surface>
          {replaceProgress ? <UploadProgressRow progress={replaceProgress} /> : null}
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
                  Upload replacement
                </Button>
              </>
            }
          />
        </div>
      </Modal>

      <Modal isOpen={deleteOpen} onClose={closeDelete}>
        <div className="space-y-4">
          <PageHeader
            variant="section"
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
            variant="section"
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
