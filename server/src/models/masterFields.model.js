const mongoose = require("mongoose");

const masterFieldSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
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

// Create the model from the schema
const MasterField = mongoose.model("MasterField", masterFieldSchema);

module.exports = MasterField;
