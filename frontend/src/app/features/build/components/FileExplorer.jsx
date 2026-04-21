import { useMemo } from "react";

function buildTree(files) {
  const root = {};
  Object.keys(files).forEach((path) => {
    const parts = path.split("/");
    let cur = root;

    parts.forEach((p, i) => {
      if (!cur[p]) cur[p] = i === parts.length - 1 ? null : {};
      cur = cur[p];
    });
  });
  return root;
}

function Tree({ tree, path = "", onSelect, selectedFile }) {
  return Object.keys(tree).map((key) => {
    const full = path ? `${path}/${key}` : key;

    if (tree[key] === null) {
      return (
        <div
          key={full}
          onClick={() => onSelect(full)}
          className={`px-2 py-1 cursor-pointer ${
            selectedFile === full ? "bg-orange-400" : "hover:bg-white/10"
          }`}
        >
          📄 {key}
        </div>
      );
    }

    return (
      <div key={full} className="ml-2">
        <div>📁 {key}</div>
        <Tree
          tree={tree[key]}
          path={full}
          onSelect={onSelect}
          selectedFile={selectedFile}
        />
      </div>
    );
  });
}

export default function FileExplorer({ files, onSelect, selectedFile }) {
  const tree = useMemo(() => buildTree(files), [files]);
  return <div className="p-2 text-sm">{<Tree tree={tree} onSelect={onSelect} selectedFile={selectedFile} />}</div>;
}