import React, { useMemo, useState } from "react";
import { SubmissionDocument } from "../../types/extraction.types";
import Modal from "../Reusable/Modal";
import ExtractedFieldsGrid from "./ExtractedFieldsGrid";
import ClientDocumentCard from "./ClientDocumentCard";
import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import ActionBar from "../Reusable/ActionBar";
import Callout from "../Reusable/Callout";
import StatusBadge from "../Reusable/StatusBadge";
import Button from "../Reusable/Button";
import IconButton from "../Reusable/IconButton";
import FileUploadZone from "../Reusable/Inputs/FileUploadZone";
import { FiFileText, FiPlus, FiX } from "react-icons/fi";
import { getFileName, getFileRef, sortDocumentsNewestFirst } from "./clientDocumentUtils";

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
          icon={FiX}
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
        back={onBack ? { label: "Back", onClick: onBack } : undefined}
        actions={
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
          <div className="mt-6 rounded-2xl border border-dashed border-card-border bg-card-muted px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-muted text-primary">
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
              const isBusy = actionLoadingId === id;
              return (
                <ClientDocumentCard
                  key={id}
                  doc={doc}
                  isBusy={isBusy}
                  onViewFields={openFieldsModal}
                  onReplace={openReplaceModal}
                  onDelete={openDeleteModal}
                />
              );
            })}
          </div>
        )}
      </Surface>

      <Modal isOpen={addOpen} onClose={() => !loading && setAddOpen(false)}>
        <div className="space-y-4">
          <PageHeader variant="section" title="Upload documents" description="Select files, then extract fields." />
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
            variant="section"
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
