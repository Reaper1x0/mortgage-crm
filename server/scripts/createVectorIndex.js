/**
 * Creates (or documents) the MongoDB Atlas vector search index for document_chunks.
 *
 * Usage:
 *   node scripts/createVectorIndex.js
 *
 * Requires MONGO_URI pointing to MongoDB Atlas (vector search is Atlas-only).
 * Local MongoDB uses in-app cosine similarity fallback automatically.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const INDEX_NAME = process.env.RAG_VECTOR_INDEX_NAME || "document_chunks_vector_index";
const COLLECTION_NAME = "documentchunks";

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collection = db.collection(COLLECTION_NAME);

  const indexDefinition = {
    name: INDEX_NAME,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: 1536,
          similarity: "cosine",
        },
        { type: "filter", path: "workspace" },
        { type: "filter", path: "submission" },
      ],
    },
  };

  try {
    const result = await collection.createSearchIndex(indexDefinition);
    console.log("Vector search index creation started:", result);
    console.log(`Index name: ${INDEX_NAME}`);
    console.log("Atlas may take a few minutes to build the index. Check Atlas UI > Search Indexes.");
  } catch (error) {
    if (error?.message?.includes("already exists")) {
      console.log(`Index "${INDEX_NAME}" already exists.`);
    } else {
      throw error;
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
