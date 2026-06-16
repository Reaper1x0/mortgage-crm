const mongoose = require("mongoose");

const documentChunkSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "workspaces",
      required: true,
      index: true,
    },
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "submissions",
      required: true,
      index: true,
    },
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: true,
      index: true,
    },
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], required: true },
    tokenCount: { type: Number, default: 0 },
    metadata: {
      documentName: { type: String, default: "" },
      documentType: { type: String, default: "" },
      mdStoragePath: { type: String, default: "" },
      checksumMd5: { type: String, default: "" },
      headingPath: { type: String, default: "" },
      startChar: { type: Number, default: 0 },
      endChar: { type: Number, default: 0 },
    },
    indexedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

documentChunkSchema.index({ workspace: 1, submission: 1 });
documentChunkSchema.index({ file: 1, chunkIndex: 1 });

module.exports = mongoose.model("DocumentChunk", documentChunkSchema);
