export type AssistantSource = {
  fileId: string;
  documentName: string;
  chunkIndex: number;
  score: number;
  excerpt: string;
};

export type AssistantQueryResponse = {
  answer: string;
  grounded: boolean;
  sources: AssistantSource[];
  retrievalCount: number;
  scope?: {
    mode: "all" | "document";
    fileIds: string[];
    documentNames?: string[];
  };
};

export type AssistantDocumentIndexStatus = {
  fileId: string;
  documentName: string;
  documentType?: string;
  rag_index_status: "pending" | "indexed" | "failed" | string;
  rag_indexed_at: string | null;
  rag_chunk_count: number;
  rag_error: string | null;
};

export type AssistantIndexStatusResponse = {
  submissionId: string;
  totalChunks: number;
  documents: AssistantDocumentIndexStatus[];
};

export type AssistantChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounded?: boolean;
  sources?: AssistantSource[];
  scopeLabel?: string;
};

export type AssistantDocumentOption = {
  fileId: string;
  documentName: string;
  rag_index_status?: string;
  rag_chunk_count?: number;
};
