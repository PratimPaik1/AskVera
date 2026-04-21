import { useMemo } from "react";
import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";

export default function Preview({ files }) {

  const { formattedFiles, template, entry, dependencies } = useMemo(() => {
    const mapped = {};

    Object.entries(files || {}).forEach(([path, content]) => {
      const normalized = path.startsWith("/") ? path : "/" + path;
      mapped[normalized] = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    });

    const keys = Object.keys(mapped);

    const detectEntry = () => {
      if (keys.includes("/index.html")) return "/index.html";
      if (keys.includes("/src/index.html")) return "/src/index.html";
      if (keys.includes("/src/main.jsx")) return "/src/main.jsx";
      if (keys.includes("/src/main.js")) return "/src/main.js";
      if (keys.includes("/src/index.jsx")) return "/src/index.jsx";
      if (keys.includes("/src/index.js")) return "/src/index.js";
      if (keys.includes("/src/App.jsx")) return "/src/App.jsx";
      if (keys.includes("/src/App.js")) return "/src/App.js";
      if (keys.includes("/index.js")) return "/index.js";
      if (keys.includes("/main.js")) return "/main.js";
      if (keys.includes("/App.js")) return "/App.js";

      const likelyEntry = keys.find((k) =>
        /\/(index|main|app)\.(jsx?|tsx?)$/i.test(k)
      );
      if (likelyEntry) return likelyEntry;

      const htmlFile = keys.find((k) => k.endsWith(".html"));
      if (htmlFile) return htmlFile;

      return keys.find((k) => k.endsWith(".js") || k.endsWith(".jsx")) || keys[0];
    };

    const detectTemplate = () => {
      if (keys.includes("/index.html") || keys.includes("/src/index.html")) return "vanilla";
      if (keys.some((f) => /\/src\/.*\.(jsx|js|tsx|ts)$/.test(f))) return "react";
      if (keys.some((f) => f.endsWith(".tsx"))) return "react-ts";
      if (keys.some((f) => f.endsWith(".jsx"))) return "react";
      return "react";
    };

    const detectDependencies = () => {
      const base = {
        react: "^19.1.1",
        "react-dom": "^19.1.1",
      };

      const pkgRaw = mapped["/package.json"];
      if (!pkgRaw) return base;

      try {
        const pkg = JSON.parse(pkgRaw);
        const pkgDeps = pkg?.dependencies && typeof pkg.dependencies === "object"
          ? pkg.dependencies
          : {};
        return { ...base, ...pkgDeps };
      } catch {
        return base;
      }
    };

    return {
      formattedFiles: mapped,
      template: detectTemplate(),
      entry: detectEntry(),
      dependencies: detectDependencies(),
    };
  }, [files]);

  return (
    <div className="h-full">
      <SandpackProvider
        template={template}
        files={formattedFiles}
        customSetup={{
          entry,
          dependencies,
        }}
        options={{
          externalResources: ["https://cdn.tailwindcss.com"],
        }}
      >
        <SandpackLayout className="h-full">
          <SandpackPreview className="h-full" />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
