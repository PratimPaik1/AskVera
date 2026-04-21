import Editor from "@monaco-editor/react";
import { useDispatch, useSelector } from "react-redux";
import { updateFileContent } from "../build.slice";

export default function CodeEditor({ file }) {
  const dispatch = useDispatch();
  const files = useSelector((s) => s.build.files);

  if (!file) return <div className="p-4">Select file</div>;

  return (
    <Editor
      height="100%"
      theme="vs-dark"
      value={files[file] || ""}
      onChange={(v) =>
        dispatch(updateFileContent({ file, content: v ?? "" }))
      }
    />
  );
}
