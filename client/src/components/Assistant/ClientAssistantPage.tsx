import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { FiRefreshCw } from "react-icons/fi";
import type { Submission } from "../../types/extraction.types";
import type { AssistantDocumentOption, AssistantIndexStatusResponse } from "../../types/assistant.types";
import { SubmissionService } from "../../service/submissionService";
import { AssistantService } from "../../service/assistantService";
import AssistantDocumentList from "./AssistantDocumentList";
import DocumentAssistantChat from "./DocumentAssistantChat";
import Button from "../Reusable/Button";
import PageHeader from "../Reusable/PageHeader";
import Surface from "../Reusable/Surface";
import {
  getFileId,
  getFileName,
  getFileRef,
  sortDocumentsNewestFirst,
} from "../Documents/clientDocumentUtils";
import { buildWorkspacePath } from "../../utils/tenantRouting";

function scopeLabel(scopeFileId: string | null, options: AssistantDocumentOption[]) {
  if (!scopeFileId) {
    const n = options.length;
    return n ? `All documents (${n})` : "All documents";
  }
  return options.find((d) => d.fileId === scopeFileId)?.documentName || "Selected document";
}

const PANEL_HEIGHT_CLASS = "h-[600px] max-h-[calc(100vh-14rem)]";

export default function ClientAssistantPage() {
  const { organizationId, workspaceId, id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const submissionsPath =
    organizationId && workspaceId
      ? buildWorkspacePath(organizationId, workspaceId, "submissions")
      : "/onboarding";

  const submissionManagePath =
    organizationId && workspaceId && id
      ? `${buildWorkspacePath(organizationId, workspaceId, `submissions/${id}`)}?step=2`
      : submissionsPath;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [indexingFileId, setIndexingFileId] = useState<string | null>(null);
  const [indexStatus, setIndexStatus] = useState<AssistantIndexStatusResponse | null>(null);
  const [scopeFileId, setScopeFileId] = useState<string | null>(searchParams.get("file"));

  useEffect(() => {
    setScopeFileId(searchParams.get("file"));
  }, [searchParams]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await SubmissionService.getSubmissionById(id);
        if (!cancelled) setSubmission(res?.submission ?? null);
      } catch {
        if (!cancelled) setSubmission(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    AssistantService.getStatus(id)
      .then((resp) =>
        setIndexStatus({
          submissionId: resp.submissionId,
          totalChunks: resp.totalChunks,
          documents: resp.documents || [],
        })
      )
      .catch(() => setIndexStatus(null));
  }, [id]);

  const sortedDocs = useMemo(
    () => sortDocumentsNewestFirst(submission?.documents || []),
    [submission?.documents]
  );

  const documentOptions = useMemo((): AssistantDocumentOption[] => {
    return sortedDocs
      .map((doc) => {
        const fileId = getFileId(doc);
        if (!fileId) return null;
        return { fileId, documentName: getFileName(doc, getFileRef(doc)) };
      })
      .filter((d): d is AssistantDocumentOption => Boolean(d));
  }, [sortedDocs]);

  const indexStatusByFileId = useMemo(() => {
    const map = new Map<string, { rag_index_status?: string; rag_chunk_count?: number }>();
    for (const d of indexStatus?.documents || []) {
      map.set(d.fileId, {
        rag_index_status: d.rag_index_status,
        rag_chunk_count: d.rag_chunk_count,
      });
    }
    return map;
  }, [indexStatus]);

  const activeScopeLabel = useMemo(
    () => scopeLabel(scopeFileId, documentOptions),
    [scopeFileId, documentOptions]
  );

  const selectScope = useCallback(
    (fileId: string | null) => {
      setScopeFileId(fileId);
      const next = new URLSearchParams(searchParams);
      if (fileId) next.set("file", fileId);
      else next.delete("file");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleReindex = async () => {
    if (!id || reindexing) return;
    try {
      setReindexing(true);
      const resp = await AssistantService.reindex(id);
      if (resp.status) setIndexStatus(resp.status);
    } finally {
      setReindexing(false);
    }
  };

  const handleIndexDocument = async (fileId: string) => {
    if (!id || indexingFileId) return;
    try {
      setIndexingFileId(fileId);
      const resp = await AssistantService.indexDocument(id, fileId);
      if (resp.status) setIndexStatus(resp.status);
    } finally {
      setIndexingFileId(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 w-48 rounded-lg bg-card-hover" />
        <div className="h-64 rounded-2xl bg-card-hover" />
      </div>
    );
  }

  if (!submission?._id) {
    return (
      <div className="p-6 text-center">
        <p className="text-text">Client not found.</p>
        <Button variant="secondary" type="button" className="mt-4" onClick={() => navigate(submissionsPath)}>
          Back to clients
        </Button>
      </div>
    );
  }

  const clientName = submission.submission_name || "Client";
  const docCount = sortedDocs.length;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 py-2 md:px-6 md:py-4">
      <PageHeader
        back={{ label: "Back to clients", onClick: () => navigate(submissionsPath) }}
        title="Document assistant"
        description={
          <>
            Ask questions about <span className="font-medium text-text">{clientName}</span>
            {submission.legal_name && submission.legal_name !== clientName ? (
              <> ({submission.legal_name})</>
            ) : null}
            . Choose a document scope, then ask in the conversation panel.
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              type="button"
              onClick={handleReindex}
              disabled={reindexing || !docCount}
              isLoading={reindexing}
            >
              <span className="inline-flex items-center gap-2">
                <FiRefreshCw />
                Reindex
              </span>
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate(submissionManagePath)}>
              Manage workflow
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:items-stretch">
        <aside className={`flex flex-col gap-2 ${PANEL_HEIGHT_CLASS}`}>
          {docCount === 0 ? (
            <Surface variant="soft" className="flex min-h-0 flex-1 flex-col justify-center p-6 text-center">
              <p className="text-sm font-medium text-text">No documents uploaded</p>
              <p className="mt-1 text-xs text-card-text">
                Upload documents in the client workflow first.
              </p>
              <Button
                variant="primary"
                type="button"
                className="mt-4"
                onClick={() => navigate(submissionManagePath)}
              >
                Go to documents
              </Button>
            </Surface>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-card-border bg-card">
              <AssistantDocumentList
                documents={sortedDocs}
                scopeFileId={scopeFileId}
                onSelect={selectScope}
                indexStatusByFileId={indexStatusByFileId}
                indexingFileId={indexingFileId}
                onIndexDocument={handleIndexDocument}
              />
            </div>
          )}
        </aside>

        <div className={PANEL_HEIGHT_CLASS}>
          {docCount > 0 && submission._id ? (
            <DocumentAssistantChat
              submissionId={submission._id}
              documents={documentOptions}
              scopeFileId={scopeFileId}
              scopeLabel={activeScopeLabel}
              onReindexComplete={setIndexStatus}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-card-border bg-card-muted p-8 text-center text-sm text-card-text">
              Upload documents to start asking questions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
