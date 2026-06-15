import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router";

import { FiArrowLeft, FiExternalLink, FiFile, FiFileText, FiImage } from "react-icons/fi";

import PageHeader from "../Reusable/PageHeader";

import Button from "../Reusable/Button";

import Card from "../Reusable/Card";

import Modal from "../Reusable/Modal";

import ActionBar from "../Reusable/ActionBar";

import { DocumentUploaderMeta } from "../Reusable/UserActionAvatar";

import ExtractedFieldsGrid from "../Documents/ExtractedFieldsGrid";

import { SubmissionService } from "../../service/submissionService";

import type { FileRef, Submission, SubmissionDocument } from "../../types/extraction.types";

import { prettyDate } from "../../utils/date";

import { resolveFileUrl } from "../../utils/fileUrl";

import { buildWorkspacePath } from "../../utils/tenantRouting";

import { usePermissions } from "../../context/PermissionContext";

import { PERMISSION_TOOLTIPS } from "../../utils/permissionUi";



function formatBytes(bytes?: number | null): string {

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

}



function getFileRef(doc: SubmissionDocument): FileRef | null {

  const d = doc.document;

  if (!d) return null;

  if (typeof d === "string") return null;

  return d as FileRef;

}



function extractedFieldCount(doc: SubmissionDocument): number {

  const list = doc.extracted_fields;

  if (!Array.isArray(list) || list.length === 0) return 0;

  const withPresent = list.filter((f) => f.present);

  return withPresent.length > 0 ? withPresent.length : list.length;

}



function fileKindIcon(contentType?: string | null, ext?: string | null) {

  const ct = (contentType || "").toLowerCase();

  const e = (ext || "").toLowerCase().replace(/^\./, "");

  if (ct.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "tif", "tiff", "heic"].includes(e)) {

    return FiImage;

  }

  if (ct.includes("pdf") || e === "pdf") return FiFileText;

  return FiFile;

}



function fileLabelForModal(doc: SubmissionDocument, file: FileRef | null): string {

  return doc.document_name?.trim() || file?.display_name || file?.original_name || "Document";

}



export default function ClientDocumentsPage() {

  const { organizationId, workspaceId, id: submissionId } = useParams();

  const navigate = useNavigate();

  const { canWorkspace } = usePermissions();

  const canRead = canWorkspace("workspace.submissions.read");



  const [submission, setSubmission] = useState<Submission | null>(null);

  const [documents, setDocuments] = useState<SubmissionDocument[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [fieldsModalDoc, setFieldsModalDoc] = useState<SubmissionDocument | null>(null);



  const clientsPath = useMemo(() => {

    if (!organizationId || !workspaceId) return "/";

    return buildWorkspacePath(organizationId, workspaceId, "submissions");

  }, [organizationId, workspaceId]);



  const managePath = useMemo(() => {

    if (!organizationId || !workspaceId || !submissionId) return "";

    return buildWorkspacePath(organizationId, workspaceId, `submissions/${submissionId}`);

  }, [organizationId, workspaceId, submissionId]);



  const load = useCallback(async () => {

    if (!submissionId || !canRead) {

      setLoading(false);

      return;

    }

    setLoading(true);

    setError(null);

    try {

      const subRes = await SubmissionService.getSubmissionById(submissionId);

      const submission = subRes?.submission ?? null;

      setSubmission(submission);

      const fromSubmission = Array.isArray(submission?.documents) ? submission.documents : [];

      setDocuments(fromSubmission);

    } catch (e) {

      console.error(e);

      setSubmission(null);

      setDocuments([]);

      setError("Could not load documents for this client.");

    } finally {

      setLoading(false);

    }

  }, [submissionId, canRead]);



  useEffect(() => {

    void load();

  }, [load]);



  const clientTitle = submission?.submission_name?.trim() || submission?.legal_name?.trim() || "Client";



  if (!organizationId || !workspaceId) {

    return (

      <div className="p-6">

        <p className="text-sm text-card-text">Missing workspace context.</p>

      </div>

    );

  }



  const documentsSection = !canRead ? (

    <p className="text-sm text-card-text">{PERMISSION_TOOLTIPS.manageClient}</p>

  ) : loading ? (

    <p className="text-sm text-card-text">Loading documents…</p>

  ) : error ? (

    <p className="text-sm text-danger-text">{error}</p>

  ) : documents.length === 0 ? (

    <Card containerClassName="max-w-xl">

      <div className="space-y-2">

        <p className="text-sm font-semibold text-text">No documents yet</p>

        <p className="text-sm text-card-text">

          Upload files from the client workspace to run extraction and attach them here.

        </p>

        {submissionId ? (

          <Button variant="primary" className="mt-2" onClick={() => navigate(managePath)}>

            Go to client workspace

          </Button>

        ) : null}

      </div>

    </Card>

  ) : (

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">

      {documents.map((doc) => {

        const file = getFileRef(doc);

        const entryId = doc._id || "";

        const displayName =

          doc.document_name?.trim() || file?.display_name || file?.original_name || "Untitled document";

        const docType = doc.document_type?.trim() || null;

        const uploadedAt = doc.uploadDate || file?.uploaded_at || file?.createdAt;

        const openUrl = resolveFileUrl(file?.url || null);

        const Icon = fileKindIcon(file?.content_type, file?.extension);

        const ext = file?.extension ? String(file.extension).replace(/^\./, "").toUpperCase() : "FILE";



        return (

          <Card key={entryId || displayName} containerClassName="h-full">

            <div className="flex h-full flex-col gap-3">

              <div className="flex items-start gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-card-border bg-background text-primary">

                  <Icon className="h-5 w-5" aria-hidden />

                </div>

                <div className="min-w-0 flex-1">

                  <div className="flex flex-wrap items-center gap-2">

                    <h3 className="truncate text-base font-semibold text-text">{displayName}</h3>

                  </div>

                  <DocumentUploaderMeta
                    uploadedBy={file?.uploaded_by}
                    tooltipUploadedAt={file?.uploaded_at}
                    uploadDate={doc.uploadDate}
                    createdAt={file?.createdAt}
                  />

                  {docType ? (

                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary">{docType}</p>

                  ) : (

                    <p className="mt-1 text-xs text-card-text">{file?.content_type || "Unknown type"}</p>

                  )}

                </div>

              </div>



              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-card-border pt-3 text-xs">

                <div>

                  <dt className="text-card-text">Uploaded</dt>

                  <dd className="font-medium text-text">{uploadedAt ? prettyDate(uploadedAt) : "—"}</dd>

                </div>

                <div>

                  <dt className="text-card-text">Size</dt>

                  <dd className="font-medium text-text">{formatBytes(file?.size_in_bytes)}</dd>

                </div>

                <div>

                  <dt className="text-card-text">Format</dt>

                  <dd className="font-medium text-text">{ext}</dd>

                </div>

                <div>

                  <dt className="text-card-text">Extracted fields</dt>

                  <dd>

                    <button

                      type="button"

                      className="font-semibold text-primary underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-shadow focus-visible:ring-offset-2 focus-visible:ring-offset-background"

                      onClick={() => setFieldsModalDoc(doc)}

                    >

                      {extractedFieldCount(doc)} field{extractedFieldCount(doc) !== 1 ? "s" : ""} — View

                    </button>

                  </dd>

                </div>

              </dl>



              <div className="mt-auto flex flex-wrap gap-2 pt-1">

                {openUrl ? (

                  <Button

                    variant="primary"

                    type="button"

                    onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}

                  >

                    <span className="inline-flex items-center gap-2">

                      <FiExternalLink className="h-4 w-4 shrink-0" aria-hidden />

                      Open file

                    </span>

                  </Button>

                ) : (

                  <span className="text-xs text-card-text">Download link unavailable</span>

                )}

              </div>

            </div>

          </Card>

        );

      })}

    </div>

  );



  return (

    <div className="space-y-4 p-2 md:p-6">

      <PageHeader

        title="Client documents"

        description={

          <>

            <span className="font-medium text-text">{clientTitle}</span>

            {submission?.legal_name && submission.legal_name !== submission.submission_name ? (

              <span className="text-card-text"> · {submission.legal_name}</span>

            ) : null}

          </>

        }

        left={

          <Button variant="secondary" onClick={() => navigate(clientsPath)} className="shrink-0">

            <span className="inline-flex items-center gap-2">

              <FiArrowLeft className="h-4 w-4 shrink-0" aria-hidden />

              Back to clients

            </span>

          </Button>

        }

        right={

          submissionId ? (

            <div className="flex flex-wrap items-center gap-2">

              <Button

                variant="secondary"

                onClick={() => navigate(managePath)}

                disabled={!canRead}

                disabledTooltip={!canRead ? PERMISSION_TOOLTIPS.manageClient : undefined}

              >

                Manage client

              </Button>

            </div>

          ) : null

        }

      />



      <section className="space-y-3">

        <h2 className="text-sm font-semibold text-text">Files ({documents.length})</h2>

        {documentsSection}

      </section>



      <Modal isOpen={!!fieldsModalDoc} onClose={() => setFieldsModalDoc(null)}>

        <div className="space-y-4">

          <PageHeader

            title="Extracted fields"

            description={

              fieldsModalDoc ? (

                <>

                  <span className="font-semibold text-text">

                    {fileLabelForModal(fieldsModalDoc, getFileRef(fieldsModalDoc))}

                  </span>

                  <span className="text-card-text"> · </span>

                  <span className="text-card-text">

                    {fieldsModalDoc.uploadDate

                      ? new Date(fieldsModalDoc.uploadDate).toLocaleString()

                      : "—"}

                  </span>

                </>

              ) : (

                "No document selected."

              )

            }

          />



          {fieldsModalDoc ? (
              <ExtractedFieldsGrid

                fields={fieldsModalDoc.extracted_fields || []}

                emptyText="No extracted fields for this document."

              />
          ) : null}



          <ActionBar

            right={

              <Button variant="secondary" type="button" onClick={() => setFieldsModalDoc(null)}>

                Close

              </Button>

            }

          />

        </div>

      </Modal>

    </div>

  );

}


