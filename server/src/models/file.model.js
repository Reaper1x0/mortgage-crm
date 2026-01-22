const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    display_name: { type: String, required: true },
    original_name: { type: String, required: true },

    // Firebase Storage
    storage_path: { type: String, required: true }, // ✅ e.g. "uploads/org123/user456/1700000_invoice.pdf"
    bucket: { type: String }, // optional if you use multiple buckets
    url: { type: String }, // download URL (convenience)

    // File info
    type: { type: String }, // pdf/docx/image/etc (your category)
    content_type: { type: String }, // ✅ actual MIME e.g. "application/pdf"
    extension: { type: String },
    size_in_bytes: { type: Number },

    // Ownership (since not Firebase Auth)
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // or String if your user ids are strings

    // Operational
    status: { type: String, enum: ["uploaded", "failed", "deleted"], default: "uploaded" },
    checksum_md5: { type: String }, // optional
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

fileSchema.index({ owner_id: 1, createdAt: -1 });
fileSchema.index({ storage_path: 1 }, { unique: true });

module.exports = mongoose.model("File", fileSchema);
