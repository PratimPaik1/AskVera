import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { buildRequest } from "./services/build.api";

function normalizeFiles(files) {
  if (!files) return {};
  if (Array.isArray(files)) {
    return files.reduce((acc, file) => {
      if (file?.filename) acc[file.filename] = file.content || "";
      return acc;
    }, {});
  }
  return files;
}

function getDefaultSelectedFile(files) {
  const keys = Object.keys(files || {});
  return keys.find((f) => f.includes("App")) || keys[0] || null;
}

export const runBuildPrompt = createAsyncThunk(
  "build/run",
  async ({ prompt, chatId }) => {
    return await buildRequest({ prompt, chatId });
  }
);

const slice = createSlice({
  name: "build",
  initialState: {
    files: {},
    selectedFile: null,
    loading: false,
    error: null,
    chatId: null,
    activeBuildId: null,
    history: [],
  },
  reducers: {
    setSelectedFile: (s, a) => {
      s.selectedFile = a.payload;
    },
    updateFileContent: (s, a) => {
      s.files[a.payload.file] = a.payload.content ?? "";
    },
    buildSocketStarted: (s, a) => {
      const { buildId, chatId, prompt, createdAt } = a.payload || {};
      s.loading = true;
      s.error = null;
      if (chatId) s.chatId = chatId;
      if (buildId) s.activeBuildId = buildId;
      if (buildId && !s.history.some((item) => item._id === buildId)) {
        s.history.unshift({
          _id: buildId,
          chatId,
          prompt,
          status: "pending",
          createdAt,
          files: [],
        });
      }
    },
    buildSocketCompleted: (s, a) => {
      const { buildId, files, createdAt } = a.payload || {};
      s.loading = false;
      s.error = null;
      s.files = normalizeFiles(files);
      s.selectedFile = getDefaultSelectedFile(s.files);
      s.activeBuildId = null;

      const idx = s.history.findIndex((item) => item._id === buildId);
      if (idx >= 0) {
        s.history[idx] = {
          ...s.history[idx],
          status: "completed",
          files: Array.isArray(files) ? files : Object.entries(files || {}).map(([filename, content]) => ({ filename, content })),
          createdAt: createdAt || s.history[idx].createdAt,
        };
      }
    },
    buildSocketError: (s, a) => {
      const { buildId, error, createdAt } = a.payload || {};
      s.loading = false;
      s.error = error || "Build failed";
      s.activeBuildId = null;

      const idx = s.history.findIndex((item) => item._id === buildId);
      if (idx >= 0) {
        s.history[idx] = {
          ...s.history[idx],
          status: "failed",
          error,
          createdAt: createdAt || s.history[idx].createdAt,
        };
      }
    },
  },
  extraReducers: (b) => {
    b.addCase(runBuildPrompt.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(runBuildPrompt.fulfilled, (s, a) => {
      s.loading = true;
      s.error = null;
      s.chatId = a.payload?.chatId || s.chatId;
      s.activeBuildId = a.payload?.buildId || s.activeBuildId;
      if (Array.isArray(a.payload?.history)) {
        s.history = a.payload.history;
      }
      const latestCompleted = (a.payload?.history || []).find((item) => item.status === "completed" && item.files?.length);
      if (latestCompleted) {
        s.files = normalizeFiles(latestCompleted.files);
        s.selectedFile = getDefaultSelectedFile(s.files);
      }
    });
    b.addCase(runBuildPrompt.rejected, (s, a) => {
      s.loading = false;
      s.error = a.error?.message || "Build request failed";
    });
  },
});

export const {
  setSelectedFile,
  updateFileContent,
  buildSocketStarted,
  buildSocketCompleted,
  buildSocketError,
} = slice.actions;
export default slice.reducer;
