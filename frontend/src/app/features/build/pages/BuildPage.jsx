import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  buildSocketCompleted,
  buildSocketError,
  buildSocketStarted,
  runBuildPrompt,
  setSelectedFile,
} from "../build.slice";

import { Navigate } from 'react-router-dom'
import FileExplorer from "../components/FileExplorer";
import CodeEditor from "../components/CodeEditor";
import Preview from "../components/Preview";
import PromptBar from "../components/PromptBar";
import {
  getBuildSocket,
  initializeBuildSocket,
} from "../services/build.socket.js";

export default function BuildPage() {
  const dispatch = useDispatch();
  const { files, selectedFile, loading, chatId } = useSelector((state) => state.build);
  
  const authLoading = useSelector((state) => state.auth.loading)
  const user = useSelector((state) => state.auth.user)
  const userId = user?.id || user?._id

  const [messages, setMessages] = useState([
    { role: "assistant", content: "AskVera ready 🚀" },
  ]);
  const lastStatusRef = useRef("");

  const fileCount = useMemo(() => Object.keys(files || {}).length, [files]);

  useEffect(() => {
    if (!userId) return;

    const socket = getBuildSocket() || initializeBuildSocket(userId);
    if (!socket) return;

    const onStart = (payload) => {
      dispatch(buildSocketStarted(payload));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Build starting...",
        },
      ]);
    };

    const onCompleted = (payload) => {
      dispatch(buildSocketCompleted(payload));
      lastStatusRef.current = "";
      const names = Array.isArray(payload?.files)
        ? payload.files.map((f) => f?.filename).filter(Boolean)
        : Object.keys(payload?.files || {});
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: names.length ? `Build completed: ${names.join(", ")}` : "Build completed.",
        },
      ]);
    };

    const onError = (payload) => {
      dispatch(buildSocketError(payload));
      lastStatusRef.current = "";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Build failed ❌ ${payload?.error || ""}`.trim(),
        },
      ]);
    };

    const onStatus = (payload) => {
      const text = payload?.message?.trim();
      if (!text) return;
      if (lastStatusRef.current === text) return;
      lastStatusRef.current = text;
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    };

    socket.on("build:stream:start", onStart);
    socket.on("build:stream:status", onStatus);
    socket.on("build:stream:completed", onCompleted);
    socket.on("build:stream:error", onError);

    return () => {
      socket.off("build:stream:start", onStart);
      socket.off("build:stream:status", onStatus);
      socket.off("build:stream:completed", onCompleted);
      socket.off("build:stream:error", onError);
    };
  }, [dispatch, userId]);

  const handlePrompt = async (prompt) => {
    setMessages((p) => [...p, { role: "user", content: prompt }]);

    try {
      await dispatch(runBuildPrompt({ prompt, chatId })).unwrap();
    } catch {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "Build failed ❌" },
      ]);
    }
  };

  if (!authLoading && !userId) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="h-screen flex flex-col bg-[#05070d] text-white">
      {/* HEADER */}
      <div className="flex justify-between p-3 border-b border-white/10">
        <div>
          <h1 className="text-lg font-bold text-orange-400">AskVera</h1>
          <p className="text-xs text-gray-400">{fileCount} files</p>
        </div>

      </div>

      {/* MAIN */}
      <div className="flex flex-1 min-h-0">

        {/* CHAT */}
        <div className="w-[20%] border-r border-white/10 flex flex-col">
          <div className="flex-1 overflow-auto p-2 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className="text-sm">
                {m.content}
              </div>
            ))}
          </div>

          <PromptBar onSubmit={handlePrompt} loading={loading} />
        </div>

        {/* FILES + EDITOR */}
        <div className="w-[40%] flex flex-col border-r border-white/10">

          <div className="h-[30%] overflow-auto border-b border-white/10">
            <FileExplorer
              files={files}
              selectedFile={selectedFile}
              onSelect={(f) => dispatch(setSelectedFile(f))}
            />
          </div>

          <div className="flex-1">
            <CodeEditor file={selectedFile} />
          </div>
        </div>

        {/* PREVIEW */}
        <div className="flex-1 min-h-0">
          <Preview files={files} />
        </div>
      </div>
    </div>
  );
}
