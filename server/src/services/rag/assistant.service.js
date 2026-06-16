const llmService = require("../llm/llm.service");
const llmConfig = require("../../config/llm.config");
const { searchSimilarChunks } = require("./vectorSearch.service");
const AuditTrailService = require("../auditTrail.service");

const NOT_FOUND_PHRASE = "The information was not found in the client documents.";

const SYSTEM_PROMPT = `You are a client document assistant for a mortgage CRM.
Answer ONLY using the document excerpts provided below.
If the excerpts contain relevant information, use it to answer — including summarizing document content when asked what a document contains.
Only respond with exactly this sentence when the excerpts truly contain no useful information for the question:
"${NOT_FOUND_PHRASE}"
Do not use general knowledge, assumptions, or outside facts.
Cite the source document name when possible.`;

function buildUserPrompt(question, chunks) {
  if (!chunks.length) {
    return `Question: ${question}\n\nDocument excerpts:\n(none retrieved)`;
  }

  const excerpts = chunks
    .map((chunk, i) => {
      const name = chunk.documentName || chunk.metadata?.documentName || "Document";
      return `[${i + 1}] Source: ${name} (chunk ${chunk.chunkIndex})\n${chunk.content}`;
    })
    .join("\n\n");

  return `Question: ${question}\n\nDocument excerpts:\n${excerpts}`;
}

function isNotFoundAnswer(answer) {
  const normalized = String(answer || "").toLowerCase();
  return normalized.includes(NOT_FOUND_PHRASE.toLowerCase());
}

async function answerQuestion({ workspaceId, submissionId, question, userId, fileIds = null }) {
  const trimmedQuestion = String(question || "").trim();
  if (!trimmedQuestion) {
    throw new Error("Question is required");
  }
  if (trimmedQuestion.length > 2000) {
    throw new Error("Question must be 2000 characters or fewer");
  }

  const normalizedFileIds = Array.isArray(fileIds)
    ? fileIds.map(String).filter(Boolean)
    : null;

  const [queryEmbedding] = await llmService.embedTexts([trimmedQuestion]);
  const topK = llmConfig.rag?.topK || 8;
  const minSimilarity = llmConfig.rag?.minSimilarity ?? 0.2;

  const retrieved = await searchSimilarChunks({
    workspaceId,
    submissionId,
    queryEmbedding,
    topK,
    fileIds: normalizedFileIds?.length ? normalizedFileIds : null,
  });

  const relevantChunks = retrieved.filter((chunk) => chunk.score >= minSimilarity);

  if (!relevantChunks.length) {
    await AuditTrailService.log({
      entity_type: "submission",
      entity_id: submissionId,
      user_id: userId,
      workspace: workspaceId,
      action: "assistant_query",
      action_details: {
        question_length: trimmedQuestion.length,
        retrieval_count: 0,
        grounded: false,
        file_ids: normalizedFileIds || [],
      },
      submission_id: submissionId,
    });

    return {
      answer: NOT_FOUND_PHRASE,
      grounded: false,
      sources: [],
      retrievalCount: 0,
      scope: {
        mode: normalizedFileIds?.length ? "document" : "all",
        fileIds: normalizedFileIds || [],
      },
    };
  }

  const userPrompt = buildUserPrompt(trimmedQuestion, relevantChunks);
  const chatResult = await llmService.chat({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0,
  });

  const answer = String(chatResult.content || "").trim() || NOT_FOUND_PHRASE;
  const grounded = !isNotFoundAnswer(answer);

  const sources = relevantChunks.map((chunk) => ({
    fileId: chunk.fileId,
    documentName: chunk.documentName || chunk.metadata?.documentName || "Document",
    chunkIndex: chunk.chunkIndex,
    score: chunk.score,
    excerpt: chunk.content.slice(0, 300),
  }));

  const scopeDocumentNames = [...new Set(sources.map((s) => s.documentName))];

  await AuditTrailService.log({
    entity_type: "submission",
    entity_id: submissionId,
    user_id: userId,
    workspace: workspaceId,
    action: "assistant_query",
    action_details: {
      question_length: trimmedQuestion.length,
      retrieval_count: relevantChunks.length,
      grounded,
      file_ids: normalizedFileIds || [],
    },
    submission_id: submissionId,
  });

  return {
    answer,
    grounded,
    sources,
    retrievalCount: relevantChunks.length,
    scope: {
      mode: normalizedFileIds?.length ? "document" : "all",
      fileIds: normalizedFileIds || [],
      documentNames: scopeDocumentNames,
    },
  };
}

module.exports = {
  answerQuestion,
  NOT_FOUND_PHRASE,
};
