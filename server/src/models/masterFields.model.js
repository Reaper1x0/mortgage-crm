const mongoose = require("mongoose");

const masterFieldSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "workspaces",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["string", "number", "date", "boolean", "array", "object"],
    },
    required: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      required: true,
    },
    validation_rules: [
      {
        type: String,
        required: false,
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
    strict: true, // Ensures only defined schema fields are stored
  }
);

masterFieldSchema.index({ workspace: 1, key: 1 }, { unique: true });

// Create the model from the schema
const MasterField = mongoose.model("MasterField", masterFieldSchema);

module.exports = MasterField;
