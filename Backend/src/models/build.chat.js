// models/build.chat.js
import mongoose from "mongoose";

const buildChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    title: {
      type: String,
      default: "New Chat"
    }
  },
  { timestamps: true }
);

buildChatSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("BuildChat", buildChatSchema);