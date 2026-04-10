const mongoose = require("mongoose");

const leadSchema = mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "workspaces",
      required: true,
      index: true,
    },
    fullName: {
      type: mongoose.Schema.Types.String,
      required: true,
      trim: true,
    },
    email: {
      type: mongoose.Schema.Types.String,
      trim: true,
      default: "",
    },
    phone: {
      type: mongoose.Schema.Types.String,
      trim: true,
      default: "",
    },
    company: {
      type: mongoose.Schema.Types.String,
      trim: true,
      default: "",
    },
    source: {
      type: mongoose.Schema.Types.String,
      trim: true,
      default: "",
    },
    notes: {
      type: mongoose.Schema.Types.String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Lead = mongoose.model("leads", leadSchema);

module.exports = Lead;
