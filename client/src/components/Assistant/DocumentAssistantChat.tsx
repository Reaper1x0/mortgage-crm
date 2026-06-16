import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiExternalLink, FiMessageCircle, FiSend } from "react-icons/fi";
import { AssistantService } from "../../service/assistantService";
import type {
  AssistantChatMessage,
  AssistantDocumentOption,
  AssistantIndexStatusResponse,
} from "../../types/assistant.types";
import StatusBadge from "../Reusable/StatusBadge";
import Modal from "../Reusable/Modal";

type DocumentAssistantChatProps = {
  submissionId: string;
  documents: AssistantDocumentOption[];
  scopeFileId: string | null;
  scopeLabel: string;
  onReindexComplete?: (status: AssistantIndexStatusResponse) => void;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function DocumentAssistantChat({
  submissionId,
  documents,
  scopeFileId,
  scopeLabel,
  onReindexComplete,
}: DocumentAssistantChatProps) {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [indexStatus, setIndexStatus] = useState<AssistantIndexStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSourcesMessageId, setActiveSourcesMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const resp = await AssistantService.getStatus(submissionId);
      const status = {
        submissionId: resp.submissionId,
        totalChunks: resp.totalChunks,
        documents: resp.documents || [],
      };
      setIndexStatus(status);
      return status;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load index status.");
      return null;
    } finally {
      setStatusLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    loadStatus().then((status) => {
      if (status) onReindexComplete?.(status);
    });
  }, [loadStatus, onReindexComplete]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const statusByFileId = useMemo(() => {
    const map = new Map<string, NonNullable<AssistantIndexStatusResponse["documents"]>[0]>();
    for (const d of indexStatus?.documents || []) map.set(d.fileId, d);
    return map;
  }, [indexStatus]);

  const scopedChunkCount = useMemo(() => {
    if (!scopeFileId) return indexStatus?.totalChunks ?? 0;
    return statusByFileId.get(scopeFileId)?.rag_chunk_count ?? 0;
  }, [scopeFileId, indexStatus, statusByFileId]);

  const submitQuestion = async () => {
    const question = input.trim();
    if (!question || loading || !documents.length) return;

    setError(null);
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", content: question, scopeLabel },
    ]);
    setLoading(true);

    try {
      const resp = await AssistantService.query(
        submissionId,
        question,
        scopeFileId ? [scopeFileId] : null
      );
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: resp.answer,
          grounded: resp.grounded,
          sources: resp.sources || [],
          scopeLabel,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to get an answer.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: "assistant", content: msg, grounded: false, scopeLabel },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitQuestion();
  };

  const activeSourcesMessage = useMemo(
    () => messages.find((msg) => msg.id === activeSourcesMessageId) || null,
    [messages, activeSourcesMessageId]
  );

  const activeSources = activeSourcesMessage?.sources || [];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm">
      <div className="shrink-0 border-b border-card-border px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FiMessageCircle className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-text">Conversation</h2>
            </div>
            <p className="mt-1 text-sm text-card-text">
              Searching: <span className="font-medium text-text">{scopeLabel}</span>
            </p>
          </div>
          {!statusLoading && (
            <StatusBadge tone={scopedChunkCount > 0 ? "success" : "warning"}>
              {scopedChunkCount > 0 ? `${scopedChunkCount} chunks indexed` : "Not indexed"}
            </StatusBadge>
          )}
        </div>
      </div>

      {error ? (
        <div className="shrink-0 border-b border-danger-border bg-danger-muted px-5 py-2.5 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
          {!messages.length && !loading && (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-4 text-center">
              <p className="text-sm font-medium text-text">Ask your first question</p>
              <p className="mt-2 max-w-sm text-sm text-card-text">
                Answers are generated only from the document scope you selected.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {["Summarize the key details", "What property is mentioned?", "List dates and amounts"].map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      className="rounded-full border border-card-border bg-card px-3 py-1.5 text-xs text-text hover:border-primary-border"
                    >
                      {s}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[88%] space-y-1.5`}>
                {msg.scopeLabel ? (
                  <p
                    className={`text-[11px] text-card-text ${msg.role === "user" ? "text-right" : ""}`}
                  >
                    {msg.role === "user" ? "Asked about" : "Answered from"}: {msg.scopeLabel}
                  </p>
                ) : null}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-text"
                      : "border border-card-border bg-card text-text"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveSourcesMessageId(msg.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-background px-3 py-1.5 text-[11px] font-medium text-card-text hover:border-primary-border hover:text-text"
                    >
                      <FiExternalLink className="h-3 w-3" />
                      <span>
                        View {msg.sources.length} source reference
                        {msg.sources.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-card-border bg-card px-4 py-3 text-sm text-card-text">
                Searching <span className="font-medium text-text">{scopeLabel}</span>…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="shrink-0 border-t border-card-border bg-card px-5 py-4">
          <div className="flex items-end gap-2 rounded-3xl border border-card-border bg-background p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!loading && input.trim() && documents.length) {
                    void submitQuestion();
                  }
                }
              }}
              placeholder={`Ask about ${scopeLabel}…`}
              rows={1}
              maxLength={2000}
              disabled={loading || !documents.length}
              className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-5 text-text placeholder:text-card-text focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !documents.length}
              className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-text transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSend className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      <Modal
        isOpen={Boolean(activeSourcesMessageId)}
        onClose={() => setActiveSourcesMessageId(null)}
        containerClassName="md:max-w-3xl"
      >
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-text">Source references</h3>
            <p className="mt-1 text-sm text-card-text">
              {activeSources.length} reference{activeSources.length !== 1 ? "s" : ""} used for this answer.
            </p>
          </div>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {activeSources.map((src, i) => (
              <div
                key={`${src.fileId}-${src.chunkIndex}-${i}`}
                className="rounded-xl border border-card-border bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-text">{src.documentName}</p>
                  {typeof src.score === "number" && (
                    <StatusBadge tone="neutral">{(src.score * 100).toFixed(0)}% relevance</StatusBadge>
                  )}
                </div>
                {src.excerpt ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-card-text">{src.excerpt}</p>
                ) : (
                  <p className="mt-2 text-xs text-card-text">No excerpt available.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
