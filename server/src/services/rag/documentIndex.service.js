const mongoose = require("mongoose");
const { DocumentChunk, File, Submission } = require("../../models");
const storageService = require("../storage.service");
const llmService = require("../llm/llm.service");
const { chunkMarkdown } = require("./chunking.service");
const documentArtifactsService = require("../document/documentArtifacts.service");

function isObjectId(v) {
  return mongoose.Types.ObjectId.isValid(v);
}

async function readMarkdownFromFile(fileDoc) {
  const meta = fileDoc.meta || {};
  const mdPath = meta.md_storage_path || documentArtifactsService.sidecarPaths(fileDoc.storage_path).mdStoragePath;
  const buffer = await storageService.getObjectBuffer(mdPath);
  return { markdown: buffer.toString("utf8"), mdPath };
}

async function readMetadataFromFile(fileDoc) {
  const meta = fileDoc.meta || {};
  const metadataPath =
    meta.metadata_storage_path ||
    documentArtifactsService.sidecarPaths(fileDoc.storage_path).metadataStoragePath;
  try {
    const buffer = await storageService.getObjectBuffer(metadataPath);
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    return null;
  }
}

async function updateFileIndexMeta(fileDoc, patch) {
  fileDoc.meta = { ...(fileDoc.meta || {}), ...patch };
  await fileDoc.save();
}

async function deleteChunksForFile(fileId) {
  if (!fileId || !isObjectId(fileId)) return { deletedCount: 0 };
  const result = await DocumentChunk.deleteMany({ file: fileId });
  return { deletedCount: result.deletedCount || 0 };
}

async function indexSubmissionDocument({ fileDoc, submissionId, workspaceId }) {
  if (!fileDoc?._id) throw new Error("indexSubmissionDocument: fileDoc is required");
  if (!submissionId || !isObjectId(submissionId)) {
    throw new Error("indexSubmissionDocument: valid submissionId is required");
  }
  if (!workspaceId || !isObjectId(workspaceId)) {
    throw new Error("indexSubmissionDocument: valid workspaceId is required");
  }

  await updateFileIndexMeta(fileDoc, {
    rag_index_status: "pending",
    rag_indexed_at: null,
    rag_chunk_count: 0,
    rag_error: null,
  });

  try {
    const { markdown, mdPath } = await readMarkdownFromFile(fileDoc);
    const sidecarMeta = await readMetadataFromFile(fileDoc);
    const trimmed = String(markdown || "").trim();

    if (!trimmed) {
      await deleteChunksForFile(fileDoc._id);
      await updateFileIndexMeta(fileDoc, {
        rag_index_status: "indexed",
        rag_indexed_at: new Date().toISOString(),
        rag_chunk_count: 0,
        rag_error: null,
      });
      return { fileId: fileDoc._id, chunkCount: 0 };
    }

    const chunks = chunkMarkdown(trimmed);
    if (!chunks.length) {
      await deleteChunksForFile(fileDoc._id);
      await updateFileIndexMeta(fileDoc, {
        rag_index_status: "indexed",
        rag_indexed_at: new Date().toISOString(),
        rag_chunk_count: 0,
        rag_error: null,
      });
      return { fileId: fileDoc._id, chunkCount: 0 };
    }

    const embeddings = await llmService.embedTexts(chunks.map((c) => c.content));
    if (embeddings.length !== chunks.length) {
      throw new Error("Embedding count mismatch during indexing");
    }

    await deleteChunksForFile(fileDoc._id);

    const documentName =
      sidecarMeta?.displayName ||
      sidecarMeta?.originalFileName ||
      fileDoc.display_name ||
      fileDoc.original_name ||
      "Document";
    const documentType = sidecarMeta?.documentType || fileDoc.meta?.document_type || fileDoc.type || "";

    const docs = chunks.map((chunk, index) => ({
      workspace: workspaceId,
      submission: submissionId,
      file: fileDoc._id,
      chunkIndex: index,
      content: chunk.content,
      embedding: embeddings[index],
      tokenCount: chunk.content.split(/\s+/).filter(Boolean).length,
      metadata: {
        documentName,
        documentType,
        mdStoragePath: mdPath,
        checksumMd5: fileDoc.checksum_md5 || "",
        headingPath: chunk.metadata?.headingPath || "",
        startChar: chunk.metadata?.startChar ?? 0,
        endChar: chunk.metadata?.endChar ?? 0,
      },
      indexedAt: new Date(),
    }));

    await DocumentChunk.insertMany(docs);

    await updateFileIndexMeta(fileDoc, {
      rag_index_status: "indexed",
      rag_indexed_at: new Date().toISOString(),
      rag_chunk_count: docs.length,
      rag_error: null,
    });

    return { fileId: fileDoc._id, chunkCount: docs.length };
  } catch (error) {
    await updateFileIndexMeta(fileDoc, {
      rag_index_status: "failed",
      rag_indexed_at: new Date().toISOString(),
      rag_error: error?.message || String(error),
    });
    throw error;
  }
}

function triggerIndexSubmissionDocument(params) {
  indexSubmissionDocument(params).catch((err) => {
    console.error("[RAG] indexSubmissionDocument failed:", err?.message || err);
  });
}

async function reindexSubmission({ submissionId, workspaceId }) {
  const submission = await Submission.findOne({ _id: submissionId, workspace: workspaceId });
  if (!submission) throw new Error("Submission not found");

  const fileIds = (submission.documents || [])
    .map((d) => d.document)
    .filter((id) => id && isObjectId(id));

  const results = [];
  for (const fileId of fileIds) {
    const fileDoc = await File.findById(fileId);
    if (!fileDoc || fileDoc.status === "deleted") {
      results.push({ fileId: String(fileId), ok: false, reason: "File not found" });
      continue;
    }
    try {
      const result = await indexSubmissionDocument({
        fileDoc,
        submissionId,
        workspaceId,
      });
      results.push({ fileId: String(fileId), ok: true, chunkCount: result.chunkCount });
    } catch (err) {
      results.push({
        fileId: String(fileId),
        ok: false,
        reason: err?.message || String(err),
      });
    }
  }

  return results;
}

async function indexDocumentByFileId({ submissionId, workspaceId, fileId }) {
  if (!fileId || !isObjectId(fileId)) {
    throw new Error("indexDocumentByFileId: valid fileId is required");
  }

  const submission = await Submission.findOne({ _id: submissionId, workspace: workspaceId });
  if (!submission) throw new Error("Submission not found");

  const linked = (submission.documents || []).some(
    (entry) => String(entry.document) === String(fileId)
  );
  if (!linked) throw new Error("Document is not attached to this submission");

  const fileDoc = await File.findById(fileId);
  if (!fileDoc || fileDoc.status === "deleted") {
    throw new Error("File not found");
  }

  const result = await indexSubmissionDocument({
    fileDoc,
    submissionId,
    workspaceId,
  });

  return { fileId: String(fileId), ok: true, chunkCount: result.chunkCount };
}

async function getSubmissionIndexStatus({ submissionId, workspaceId }) {
  const submission = await Submission.findOne({ _id: submissionId, workspace: workspaceId }).lean();
  if (!submission) throw new Error("Submission not found");

  const documents = [];
  for (const entry of submission.documents || []) {
    const fileId = entry.document;
    if (!fileId) continue;
    const fileDoc = await File.findById(fileId).lean();
    if (!fileDoc) continue;
    const meta = fileDoc.meta || {};
    documents.push({
      fileId: String(fileId),
      documentName: entry.document_name || fileDoc.display_name || fileDoc.original_name,
      documentType: entry.document_type || meta.document_type || fileDoc.type,
      rag_index_status: meta.rag_index_status || "pending",
      rag_indexed_at: meta.rag_indexed_at || null,
      rag_chunk_count: meta.rag_chunk_count ?? 0,
      rag_error: meta.rag_error || null,
    });
  }

  const totalChunks = await DocumentChunk.countDocuments({
    workspace: workspaceId,
    submission: submissionId,
  });

  return {
    submissionId: String(submissionId),
    totalChunks,
    documents,
  };
}

module.exports = {
  readMarkdownFromFile,
  indexSubmissionDocument,
  triggerIndexSubmissionDocument,
  indexDocumentByFileId,
  deleteChunksForFile,
  reindexSubmission,
  getSubmissionIndexStatus,
};
