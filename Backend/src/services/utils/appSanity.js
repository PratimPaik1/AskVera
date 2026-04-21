function toStringContent(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function normalizePath(path) {
  const parts = String(path || "").split("/");
  const out = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

function dirname(path) {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

function extname(path) {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? "" : path.slice(idx).toLowerCase();
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function hasAny(files, names) {
  return names.some((name) => Object.prototype.hasOwnProperty.call(files, name));
}

function collectImports(fileContent) {
  const imports = [];
  const fromRegex = /import\s+([^'";]+?)\s+from\s+['"]([^'"]+)['"]/g;
  const sideEffectRegex = /import\s+['"]([^'"]+)['"]/g;

  let m;
  while ((m = fromRegex.exec(fileContent)) !== null) {
    imports.push({ clause: (m[1] || "").trim(), spec: (m[2] || "").trim() });
  }
  while ((m = sideEffectRegex.exec(fileContent)) !== null) {
    imports.push({ clause: "", spec: (m[1] || "").trim() });
  }

  return imports;
}

function buildStubContent(modulePath, importClause, fileExt) {
  if (modulePath.endsWith(".css")) return "/* auto-generated missing stylesheet */\n";
  if (modulePath.endsWith(".json")) return "{}\n";

  const named = [];
  const namedMatch = importClause.match(/\{([^}]*)\}/);
  if (namedMatch?.[1]) {
    namedMatch[1]
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .forEach((n) => {
        const local = n.split(/\s+as\s+/i)[1] || n.split(/\s+as\s+/i)[0];
        const cleaned = local.trim();
        if (cleaned && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(cleaned)) named.push(cleaned);
      });
  }

  const lines = [];
  lines.push("// Auto-generated stub for missing import.");
  for (const n of named) lines.push(`export const ${n} = undefined;`);

  const baseName = modulePath.split("/").pop() || "Stub";
  const fnName = baseName.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_$]/g, "") || "Stub";
  lines.push(`export default function ${fnName}() { return null; }`);

  if (fileExt === ".ts" || fileExt === ".tsx") {
    return lines.join("\n") + "\n";
  }
  return lines.join("\n") + "\n";
}

function ensureReferencedRelativeFiles(files) {
  const sourceFiles = Object.keys(files).filter((p) => /\.(jsx?|tsx?)$/i.test(p));
  const exts = [".js", ".jsx", ".ts", ".tsx", ".css", ".json"];

  for (const filePath of sourceFiles) {
    const content = files[filePath];
    const imports = collectImports(content);

    for (const { clause, spec } of imports) {
      if (!spec.startsWith(".")) continue;

      const sourceDir = dirname(filePath);
      const resolvedBase = normalizePath(`${sourceDir}/${spec}`);

      const candidates = [];
      const specExt = extname(spec);
      if (specExt) {
        candidates.push(resolvedBase);
      } else {
        for (const ext of exts) candidates.push(`${resolvedBase}${ext}`);
        for (const ext of exts) candidates.push(`${resolvedBase}/index${ext}`);
      }

      const exists = candidates.find((c) => Object.prototype.hasOwnProperty.call(files, c));
      if (exists) continue;

      const preferredExt = specExt || ([".tsx", ".ts"].includes(extname(filePath)) ? ".tsx" : ".js");
      const target = specExt ? resolvedBase : `${resolvedBase}${preferredExt}`;
      files[target] = buildStubContent(spec, clause, preferredExt);
    }
  }
}

function collectExternalPackages(files) {
  const pkgs = new Set();
  const sourceFiles = Object.keys(files).filter((p) => /\.(jsx?|tsx?)$/i.test(p));
  for (const filePath of sourceFiles) {
    for (const imp of collectImports(files[filePath])) {
      const spec = imp.spec;
      if (!spec || spec.startsWith(".") || spec.startsWith("/")) continue;
      if (spec.startsWith("@")) {
        const parts = spec.split("/");
        pkgs.add(parts.length > 1 ? `${parts[0]}/${parts[1]}` : parts[0]);
      } else {
        pkgs.add(spec.split("/")[0]);
      }
    }
  }
  return pkgs;
}

function fixJSXSyntax(content) {
  let fixed = toStringContent(content);

  // Fix invalid className expressions missing template literals:
  // className={step ${cond1 ? 'a' : ''} ${cond2 ? 'b' : ''}}
  // -> className={`step ${cond1 ? 'a' : ''} ${cond2 ? 'b' : ''}`}
  fixed = fixed.replace(/className=\{([A-Za-z][A-Za-z0-9_-]*(?:\s+[A-Za-z0-9_-]+)*)\s+((?:\$\{[^}]+\}\s*)+)\}/g, (match, baseClass, exprBlocks) => {
    const normalizedClass = baseClass.trim().replace(/\s+/g, "-");
    const normalizedExpr = exprBlocks.trim().replace(/\s+/g, " ");
    return `className={\`${normalizedClass} ${normalizedExpr}\`}`;
  });

  // Fix broken template literals with unmatched braces
  // This is a simple fix for common cases
  fixed = fixed.replace(/`([^`]*)(\$\{[^}]*)([^`]*$)/g, (match, before, expr, after) => {
    if (!after.includes('`')) {
      return `\`${before}${expr}${after}\``;
    }
    return match;
  });

  // Fix className={variable} where variable is a string - convert to className="variable"
  // But this is tricky without knowing if variable is a string or expression
  // For now, leave it as is since it might be valid

  return fixed;
}

function wrapAppTopLevelReturn(content) {
  const text = toStringContent(content);
  const hasComponentDeclaration =
    /(?:export\s+default\s+)?function\s+App\s*\(/m.test(text) ||
    /const\s+App\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/m.test(text) ||
    /const\s+App\s*=\s*(?:async\s*)?[^=]*=>/m.test(text);

  // If App component already exists, keep as-is.
  if (hasComponentDeclaration) return text;

  // Heuristic: top-level return likely means model dropped the component wrapper.
  if (!/^\s*return\s*\(/m.test(text)) return text;

  const lines = text.split(/\r?\n/);
  const importLines = [];
  const nonImportLines = [];

  for (const line of lines) {
    if (/^\s*import\s+/.test(line)) {
      importLines.push(line);
      continue;
    }
    nonImportLines.push(line);
  }

  const body = nonImportLines
    .join("\n")
    .replace(/^\s*export\s+default\s+App\s*;?\s*$/gm, "")
    .trim();

  if (!body) return text;

  const indentedBody = body
    .split("\n")
    .map((line) => (line.trim() ? `  ${line}` : ""))
    .join("\n");

  return `${importLines.join("\n")}${importLines.length ? "\n\n" : ""}function App() {\n${indentedBody}\n}\n\nexport default App;`;
}

export function isRunnableAppFiles(files) {
  const keys = Object.keys(files || {});
  if (keys.length === 0) return false;

  const hasHtmlEntry = keys.includes("index.html");
  const hasScriptLike = keys.some((k) => /\.(js|jsx|ts|tsx)$/i.test(k));
  const hasSrcMain = keys.some((k) => /^src\/(main|index|App)\.(js|jsx|ts|tsx)$/i.test(k));
  const hasPlainStarter = keys.includes("script.js") || keys.includes("style.css");
  const hasOnlyMeta = keys.every((k) => /(package\.json|tsconfig\.json|vite\.config\.(js|ts)|readme\.md|\.eslintrc(\.json)?|\.prettierrc)$/i.test(k));

  if (hasOnlyMeta) return false;
  if (hasHtmlEntry && (hasPlainStarter || hasScriptLike)) return true;
  if (hasSrcMain) return true;
  if (hasScriptLike && keys.length > 1) return true;
  return false;
}

export function ensureWorkingAppFiles(rawFiles) {
  const files = {};
  Object.entries(rawFiles || {}).forEach(([path, content]) => {
    let safeContent = toStringContent(content);

    // Fix JSX syntax in JS/JSX/TS/TSX files
    if (/\.(js|jsx|ts|tsx)$/.test(path)) {
      safeContent = fixJSXSyntax(safeContent);
      if (/(^|\/)App\.(js|jsx|ts|tsx)$/i.test(path)) {
        safeContent = wrapAppTopLevelReturn(safeContent);
      }
    }

    files[path] = safeContent;
  });

  const normalizedFiles = { ...files };

  // Always ensure index.html exists and has correct script tag
  if (normalizedFiles["index.html"]) {
    let htmlContent = toStringContent(normalizedFiles["index.html"]);
    if (!htmlContent.includes('<script type="module" src="/index.js"></script>')) {
      // Add the script tag if missing
      htmlContent = htmlContent.replace('</body>', '  <script type="module" src="/index.js"></script>\n</body>');
    }
    normalizedFiles["index.html"] = htmlContent;
  } else {
    normalizedFiles["index.html"] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/index.js"></script>
</body>
</html>`;
  }

  // Always ensure index.js exists
  if (normalizedFiles["index.js"]) {
    normalizedFiles["index.js"] = toStringContent(normalizedFiles["index.js"]);
  } else if (normalizedFiles["src/main.js"] || normalizedFiles["src/main.jsx"] || normalizedFiles["src/index.js"]) {
    // Convert src/main.* to index.js
    const mainFile = toStringContent(normalizedFiles["src/main.js"] || normalizedFiles["src/main.jsx"] || normalizedFiles["src/index.js"]);
    normalizedFiles["index.js"] = mainFile
      .replace(/from\s+['"]\.\/App['"]/g, normalizedFiles["src/App.js"] || normalizedFiles["src/App.jsx"] ? 'from "./src/App.js"' : 'from "./App.js"')
      .replace(/from\s+['"]\.\/styles['"]/g, normalizedFiles["src/styles.css"] ? 'from "./src/styles.css"' : 'from "./styles.css"');
  } else {
    normalizedFiles["index.js"] = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import './styles.css';

const root = createRoot(document.getElementById('root'));
root.render(<App />);`;
  }

  // Ensure there is an app component available.
  if (!normalizedFiles["App.js"] && normalizedFiles["src/App.js"]) {
    normalizedFiles["App.js"] = toStringContent(normalizedFiles["src/App.js"]);
  } else if (!normalizedFiles["App.js"] && normalizedFiles["src/App.jsx"]) {
    normalizedFiles["App.js"] = toStringContent(normalizedFiles["src/App.jsx"]);
  } else if (!normalizedFiles["App.js"] && !normalizedFiles["src/App.js"] && !normalizedFiles["src/App.jsx"]) {
    normalizedFiles["App.js"] = `import React from 'react';

function App() {
  return (
    <div className="app">
      <h1>Hello World</h1>
      <p>This is a React app.</p>
    </div>
  );
}

export default App;`;
  }

  // Ensure stylesheet exists for starter imports.
  if (!normalizedFiles["styles.css"] && (normalizedFiles["src/styles.css"] || normalizedFiles["style.css"])) {
    normalizedFiles["styles.css"] = toStringContent(normalizedFiles["src/styles.css"] || normalizedFiles["style.css"]);
  } else if (!normalizedFiles["styles.css"]) {
    normalizedFiles["styles.css"] = `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}

.app {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #333;
}`;
  }

  // Fix imports in JS-like files to point to valid paths.
  Object.keys(normalizedFiles).forEach(filePath => {
    if (/\.(js|jsx|ts|tsx)$/.test(filePath)) {
      let content = toStringContent(normalizedFiles[filePath]);
      if (filePath === "index.js") {
        const appTarget = normalizedFiles["App.js"] ? "./App.js" : (normalizedFiles["src/App.js"] || normalizedFiles["src/App.jsx"] ? "./src/App.js" : "./App.js");
        const styleTarget = normalizedFiles["styles.css"] ? "./styles.css" : (normalizedFiles["src/styles.css"] ? "./src/styles.css" : "./styles.css");
        content = content.replace(/from\s+['"]\.\/App['"]/g, `from "${appTarget}"`);
        content = content.replace(/from\s+['"]\.\/styles['"]/g, `from "${styleTarget}"`);
      }
      normalizedFiles[filePath] = content;
    }
  });

  ensureReferencedRelativeFiles(normalizedFiles);
  return normalizedFiles;
}
