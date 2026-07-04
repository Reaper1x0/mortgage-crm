import React, { useMemo, useState } from "react";
import { SubmissionDocument } from "../../types/extraction.types";
import Modal from "../Reusable/Modal";
import ExtractedFieldsGrid from "./ExtractedFieldsGrid";
import UploadedDocumentCard from "./UploadedDocumentCard";
import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import ActionBar from "../Reusable/ActionBar";
import Callout from "../Reusable/Callout";
import StatusBadge from "../Reusable/StatusBadge";
import Button from "../Reusable/Button";
import FileUploader from "../Reusable/Inputs/FileUploader";
import type { FileUploadProgressCallback } from "../../utils/uploadProgress";
import { FiFileText, FiPlus } from "react-icons/fi";
import { Loader } from "../../assets/Loader";
import { getFileName, getFileRef, sortDocumentsNewestFirst } from "./clientDocumentUtils";

function DocumentCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-card-border bg-card">
      <div className="h-20 bg-card-hover" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-card-hover" />
        <div className="h-3 w-1/2 rounded bg-card-hover" />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-card-hover" />
          <div className="h-6 w-20 rounded-full bg-card-hover" />
        </div>
        <div className="flex justify-between pt-1">
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-lg bg-card-hover" />
            <div className="h-8 w-8 rounded-lg bg-card-hover" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-lg bg-card-hover" />
            <div className="h-8 w-8 rounded-lg bg-card-hover" />
          </div>
        </div>
      </div>
    </div>
  );
}

export type ClientDocumentsPanelProps = {
  clientTitle?: string;
  clientLegalName?: string | null;
  existingDocuments: SubmissionDocument[];
  documentsLoading?: boolean;
  uploadDocument: (file: File, onProgress: FileUploadProgressCallback) => Promise<void>;
  onDocumentsUploaded?: () => void;
  onUploadFailed?: (message: string) => void;
  onExtractFields: (docEntryId: string) => Promise<boolean>;
  replaceDocument: (
    docEntryId: string,
    file: File,
    onProgress?: FileUploadProgressCallback
  ) => Promise<void>;
  onDeleteExisting: (docEntryId: string) => Promise<void>;
  onBack?: () => void;
  extractingDocId?: string | null;
};

const ClientDocumentsPanel: React.FC<ClientDocumentsPanelProps> = ({
  clientTitle,
  clientLegalName,
  existingDocuments,
  documentsLoading = false,
  uploadDocument,
  onDocumentsUploaded,
  onUploadFailed,
  onExtractFields,
  replaceDocument,
  onDeleteExisting,
  onBack,
  extractingDocId = null,
}) => {
  const [addOpen, setAddOpen] = useState(false);

  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceForId, setReplaceForId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteForId, setDeleteForId] = useState<string | null>(null);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [fieldsForId, setFieldsForId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [extractModalDoc, setExtractModalDoc] = useState<SubmissionDocument | null>(null);

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

  const closeReplace = () => {
    if (actionLoadingId) return;
    setReplaceOpen(false);
    setReplaceForId(null);
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
    const doc = sortedDocs.find((entry) => entry._id === docEntryId) || null;
    setExtractModalDoc(doc);
    setExtractModalOpen(true);
    try {
      await onExtractFields(docEntryId);
    } finally {
      setExtractModalOpen(false);
      setExtractModalDoc(null);
    }
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
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Client documents"
        description={description}
        back={onBack ? { label: "Back", onClick: onBack } : undefined}
        actions={
          <Button variant="primary" type="button" onClick={() => setAddOpen(true)}>
            <span className="inline-flex items-center gap-2">
              <FiPlus /> Upload documents
            </span>
          </Button>
        }
      />

      <Surface variant="soft" className="min-w-0 overflow-hidden p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-text">All files</h2>
            <p className="mt-0.5 text-sm text-card-text">
              {documentsLoading
                ? "Loading documents…"
                : sortedDocs.length === 0
                  ? "No documents uploaded yet."
                  : `${sortedDocs.length} document${sortedDocs.length === 1 ? "" : "s"} on file`}
            </p>
          </div>
          {documentsLoading ? (
            <StatusBadge tone="neutral">Loading</StatusBadge>
          ) : sortedDocs.length > 0 ? (
            <StatusBadge tone="neutral">{sortedDocs.length} total</StatusBadge>
          ) : null}
        </div>

        {documentsLoading ? (
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <DocumentCardSkeleton key={`doc-skeleton-${index}`} />
            ))}
          </div>
        ) : sortedDocs.length === 0 ? (
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
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedDocs.map((doc) => {
              const id = doc._id as string;
              const isBusy = actionLoadingId === id;
              const isExtracting = extractingDocId === id;
              return (
                <div key={id} className="min-w-0">
                  <UploadedDocumentCard
                    doc={doc}
                    isBusy={isBusy}
                    isExtracting={isExtracting}
                    onExtract={handleExtract}
                    onViewFields={openFieldsModal}
                    onReplace={openReplaceModal}
                    onDelete={openDeleteModal}
                  />
                </div>
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
          <FileUploader
            name="add-documents"
            multiple
            accept=".pdf,.docx,image/*"
            hint="PDF, DOCX, or images"
            resetWhen={addOpen}
            uploadFile={uploadDocument}
            onAllComplete={() => {
              onDocumentsUploaded?.();
              setAddOpen(false);
            }}
            onUploadError={(errors) => {
              onUploadFailed?.(errors[0]?.error || "Upload failed.");
            }}
            footer={
              <Button variant="secondary" type="button" onClick={closeAdd}>
                Close
              </Button>
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
            <FileUploader
              name="replace-document"
              multiple={false}
              accept=".pdf,.docx,image/*"
              hint="PDF, DOCX, or image"
              resetWhen={replaceOpen}
              uploadButtonLabel="Upload replacement"
              uploadFile={async (file, onProgress) => {
                if (!replaceForId) throw new Error("No document selected.");
                setActionLoadingId(replaceForId);
                try {
                  await replaceDocument(replaceForId, file, onProgress);
                } finally {
                  setActionLoadingId(null);
                }
              }}
              onAllComplete={() => {
                setReplaceOpen(false);
                setReplaceForId(null);
              }}
              footer={
                <Button variant="secondary" type="button" disabled={!!actionLoadingId} onClick={closeReplace}>
                  Cancel
                </Button>
              }
            />
          </Surface>
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

      <Modal isOpen={extractModalOpen} onClose={() => {}} showCloseButton={false}>
        <div className="flex flex-col items-center px-2 py-8 text-center sm:px-4">
          <Loader className="h-10 w-10 text-primary" />
          <h2 className="mt-5 text-lg font-semibold text-text">Extracting fields</h2>
          <p className="mt-2 max-w-sm text-sm text-card-text">
            {extractModalDoc
              ? `Reading ${getFileName(extractModalDoc, getFileRef(extractModalDoc))} and matching master fields.`
              : "Reading the document and matching master fields."}
          </p>
          <p className="mt-3 text-xs text-card-text">This may take a minute. Please keep this window open.</p>
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
            <ExtractedFieldsGrid
              fields={selectedDoc.extracted_fields || []}
              emptyText="No extracted fields for this document."
            />
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
