const mongoose = require("mongoose");

const placementSchema = new mongoose.Schema(
  {
    placementId: { type: String, required: true }, // uuid from frontend
    fieldKey: { type: String, required: true },    // MasterField.key
    pageIndex: { type: Number, required: true },   // 0-based

    // normalized 0..1 (relative to PDF page)
    rect: {
      x: { type: Number, required: true, min: 0, max: 1 },
      y: { type: Number, required: true, min: 0, max: 1 },
      w: { type: Number, required: true, min: 0, max: 1 },
      h: { type: Number, required: true, min: 0, max: 1 },
    },

    // optional display label for designer UI
    label: { type: String, default: "" },

    style: {
      fontSize: { type: Number, default: 12 },
      align: { type: String, enum: ["left", "center", "right"], default: "left" },
      multiline: { type: Boolean, default: false },
      lineHeight: { type: Number, default: 14 },
    },
  },
  { _id: false }
);

const templateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    file: {
      originalName: { type: String, required: true },
      storagePath: { type: String, required: true }, // local disk path
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
    },

    pageCount: { type: Number, default: 1 },
    placements: { type: [placementSchema], default: [] },
  },
  { timestamps: true }
);

const Template = mongoose.model("Template", templateSchema);
module.exports = Template;
