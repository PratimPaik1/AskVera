import Build from "../models/build.js";
import BuildChat from "../models/build.chat.js";
import { runBuildPipeline } from "../services/orchestrator.service.js";
import { getIo } from "../sockets/server.socket.js";

export const createBuild = async (req, res) => {
  try {
    const { prompt, chatId } = req.body;
    const userId = req.user.id;
    const io = getIo();
    const socketRoom = `user:${userId}`;
    console.log({ prompt, chatId, userId });

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    let chat;

    if (!chatId) {
      chat = await BuildChat.create({
        userId,
        title: prompt.trim().slice(0, 30)
      });
    } else {
      chat = await BuildChat.findOne({ _id: chatId, userId });

      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
    }

    const build = await Build.create({
      chatId: chat._id,
      userId,
      prompt,
      status: "pending"
    });


    io.to(socketRoom).emit("build:stream:start", {
      buildId: build._id.toString(),
      chatId: chat._id.toString(),
      prompt,
      status: "pending",
      createdAt: build.createdAt
    });

    const emitProgress = ({ stage, message }) => {
      io.to(socketRoom).emit("build:stream:status", {
        buildId: build._id.toString(),
        chatId: chat._id.toString(),
        stage,
        message,
        createdAt: build.createdAt
      });
    };

    emitProgress({ stage: "queued", message: "Build queued. Starting AI pipeline..." });

    const previousCompletedBuild = await Build.findOne({
      chatId: chat._id,
      status: "completed",
      _id: { $ne: build._id }
    }).sort({ createdAt: -1 });

    const recentBuilds = await Build.find({
      chatId: chat._id,
      _id: { $ne: build._id }
    })
      .sort({ createdAt: -1 })
      .limit(5);

    runBuildPipeline(
      prompt.trim(),
      {
        recentPrompts: recentBuilds.map((b) => b.prompt).filter(Boolean),
        previousFiles: previousCompletedBuild?.files || []
      },
      {
        onProgress: emitProgress
      }
    )
      .then(async (result) => {
        console.log("Files:", Object.keys(result.files || {}));

        if (!result.files || Object.keys(result.files).length === 0) {
          throw new Error("Empty files from AI");
        }

        const filesArray = Object.entries(result.files).map(
          ([filename, content]) => {
            let safeContent = "";

            if (typeof content === "string") {
              safeContent = content;
            } else if (content == null) {
              safeContent = "";
            } else if (typeof content === "object") {
              safeContent = JSON.stringify(content, null, 2);
            } else {
              safeContent = String(content);
            }

            return { filename, content: safeContent };
          }
        );

        await Build.findByIdAndUpdate(build._id, {
          status: "completed",
          files: filesArray
        });

        const filesForSocket = filesArray.reduce((acc, file) => {
          acc[file.filename] = file.content;
          return acc;
        }, {});

        io.to(socketRoom).emit("build:stream:completed", {
          buildId: build._id.toString(),
          chatId: chat._id.toString(),
          status: "completed",
          files: filesForSocket,
          createdAt: build.createdAt
        });

      })
      .catch(async (err) => {
        const message = err?.message || "Build pipeline failed";
        console.error("[build:pipeline:error]", err);

        await Build.findByIdAndUpdate(build._id, {
          status: "failed",
          error: message,
          files: []
        });

        io.to(socketRoom).emit("build:stream:error", {
          buildId: build._id.toString(),
          chatId: chat._id.toString(),
          status: "failed",
          error: message,
          createdAt: build.createdAt
        });
      });


    const history = await Build.find({ chatId: chat._id })
      .sort({ createdAt: -1 })
      ;


    return res.json({
      message: "Build started",
      chatId: chat._id,
      buildId: build._id,
      history
    });

  } catch (err) {

    return res.status(500).json({
      error: err?.message || "Failed to create build"
    });
  }
};
