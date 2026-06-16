const mongoose = require("mongoose");
const { DocumentChunk } = require("../../models");
const llmConfig = require("../../config/llm.config");

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function toObjectId(id) {
  return new mongoose.Types.ObjectId(String(id));
}

function formatChunkResult(doc, score) {
  return {
    _id: doc._id,
    fileId: String(doc.file),
    chunkIndex: doc.chunkIndex,
    content: doc.content,
    score,
    metadata: doc.metadata || {},
    documentName: doc.metadata?.documentName || "Document",
  };
}

async function searchWithAtlas({
  workspaceId,
  submissionId,
  queryEmbedding,
  topK,
  indexName,
  fileIds,
}) {
  const filter = {
    workspace: toObjectId(workspaceId),
    submission: toObjectId(submissionId),
  };
  if (Array.isArray(fileIds) && fileIds.length) {
    filter.file = { $in: fileIds.map(toObjectId) };
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: indexName,
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: Math.max(topK * 10, 100),
        limit: topK,
        filter,
      },
    },
    {
      $addFields: {
        score: { $meta: "vectorSearchScore" },
      },
    },
    {
      $project: {
        file: 1,
        chunkIndex: 1,
        content: 1,
        metadata: 1,
        score: 1,
      },
    },
  ];

  const results = await DocumentChunk.aggregate(pipeline);
  return results.map((doc) => formatChunkResult(doc, doc.score ?? 0));
}

async function searchWithCosineFallback({
  workspaceId,
  submissionId,
  queryEmbedding,
  topK,
  fileIds,
}) {
  const query = {
    workspace: workspaceId,
    submission: submissionId,
  };
  if (Array.isArray(fileIds) && fileIds.length) {
    query.file = { $in: fileIds };
  }

  const chunks = await DocumentChunk.find(query)
    .select("file chunkIndex content metadata embedding")
    .lean();

  const scored = chunks
    .map((doc) => ({
      doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(({ doc, score }) => formatChunkResult(doc, score));
}

async function searchSimilarChunks({
  workspaceId,
  submissionId,
  queryEmbedding,
  topK = llmConfig.rag?.topK || 8,
  fileIds = null,
}) {
  if (!workspaceId || !submissionId || !Array.isArray(queryEmbedding)) {
    throw new Error("searchSimilarChunks: workspaceId, submissionId, and queryEmbedding are required");
  }

  const indexName = llmConfig.rag?.vectorIndexName || "document_chunks_vector_index";

  try {
    return await searchWithAtlas({
      workspaceId,
      submissionId,
      queryEmbedding,
      topK,
      indexName,
      fileIds,
    });
  } catch (error) {
    const message = error?.message || String(error);
    if (
      message.includes("$vectorSearch") ||
      message.includes("vectorSearch") ||
      message.includes("index not found") ||
      message.includes("Search index")
    ) {
      console.warn("[RAG] Atlas vector search unavailable, using cosine fallback:", message);
      return searchWithCosineFallback({
        workspaceId,
        submissionId,
        queryEmbedding,
        topK,
        fileIds,
      });
    }
    throw error;
  }
}

module.exports = {
  searchSimilarChunks,
  cosineSimilarity,
};
