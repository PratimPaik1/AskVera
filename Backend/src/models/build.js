// models/Build.js
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    filename: String,
    content: String
  },
  { _id: false }
);

const buildSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BuildChat",
      required: true,
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    prompt: String,

    files: [fileSchema],

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending"
    },

    error: String
  },
  { timestamps: true }
);

// 🔥 critical index
buildSchema.index({ chatId: 1, createdAt: -1 });

export default mongoose.model("Build", buildSchema);