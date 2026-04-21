import { isRunnableAppFiles } from "../utils/appSanity.js";
import { safeParseJSON } from "../utils/jsonParser.js";

const collectImports = (content) => {
  const imports = [];
  const importRegex = /import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
};

const normalizePath = (path) => {
  const parts = String(path || "").split("/");
  const normalized = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }
  return normalized.join("/");
};

const resolveRelativeImport = (sourcePath, spec) => {
  const sourceDir = sourcePath.slice(0, sourcePath.lastIndexOf("/") + 1);
  const normalized = normalizePath(`${sourceDir}${spec}`);
  return normalized;
};

const possibleExtensions = [".js", ".jsx", ".ts", ".tsx", ".css", ".json"];

const fileExists = (files, target) => {
  if (Object.prototype.hasOwnProperty.call(files, target)) return true;
  const hasExt = possibleExtensions.some((ext) => Object.prototype.hasOwnProperty.call(files, `${target}${ext}`));
  if (hasExt) return true;
  return possibleExtensions.some((ext) => Object.prototype.hasOwnProperty.call(files, `${target}/index${ext}`));
};

const validateJSXSyntax = (content, filePath) => {
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for invalid className patterns: className={something ${...}}
    const invalidClassNameRegex = /className=\{([^{}]*(?:\$\{[^{}]*\}[^{}]*)*)\}/g;
    let match;
    while ((match = invalidClassNameRegex.exec(line)) !== null) {
      const classValue = match[1].trim();
      // Reject if className contains unquoted class names followed by ${}
      if (/^[a-zA-Z][a-zA-Z0-9-\s]*\s+\$\{/.test(classValue) ||
          (/^[a-zA-Z][a-zA-Z0-9-\s]*[a-zA-Z]/.test(classValue) && !classValue.includes('`'))) {
        // Extract the class name and variable parts
        const parts = classValue.split(/\$\{(.+)\}/);
        const baseClass = parts[0].trim().replace(/\s+/g, '-');
        const variable = parts[1];
        const fixed = line.replace(match[0], `className={\`${baseClass} \${${variable}}\`}`);
        return {
          status: "error",
          reason: "Invalid JSX syntax",
          line: lineNumber,
          fix: fixed
        };
      }
    }

    // Check for broken template literals (unclosed ${})
    const templateRegex = /`([^`]*(?:\$\{[^}]*\}[^`]*)*[^`]*$)/g;
    while ((match = templateRegex.exec(line)) !== null) {
      const templateContent = match[1];
      const openCount = (templateContent.match(/\$\{/g) || []).length;
      const closeCount = (templateContent.match(/\}/g) || []).length;
      if (openCount !== closeCount) {
        const fixed = line.replace(match[0], `\`${templateContent}\``);
        return {
          status: "error",
          reason: "Invalid JSX syntax",
          line: lineNumber,
          fix: fixed
        };
      }
    }

    // Check for invalid JSX expressions with mixed syntax
    const jsxExprRegex = /\{([^}]*?className=[^{}]*?)\}/g;
    while ((match = jsxExprRegex.exec(line)) !== null) {
      const expr = match[1];
      if (expr.includes('className=') && !expr.includes('`') && /\s+\$\{/.test(expr)) {
        const fixed = expr.replace(/className=\{([^}]*?)\$\{([^}]*?)\}/, 'className={`$1 ${$2}`}')
                          .replace(/\s+/g, ' ');
        return {
          status: "error",
          reason: "Invalid JSX syntax",
          line: lineNumber,
          fix: line.replace(match[0], `{${fixed}}`)
        };
      }
    }
  }

  return null; // No errors found
};

const countDefaultExports = (content) => (content.match(/\bexport\s+default\b/g) || []).length;

const hasTopLevelReturn = (content) => {
  const lines = String(content || "").split("\n");
  let depth = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\/\/.*$/, "");
    if (depth === 0 && /^\s*return\s*\(/.test(line)) return true;
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    depth += opens - closes;
    if (depth < 0) depth = 0;
  }

  return false;
};

const hasExportInsideFunction = (content) => {
  const lines = String(content || "").split("\n");
  let depth = 0;
  let functionDepthStack = [];
  let awaitingFunctionBrace = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\/\/.*$/, "");

    const functionDecl = /\bfunction\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\(/.test(line);
    const arrowDecl = /\bconst\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>/.test(line);
    const methodLike = /^\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\([^)]*\)\s*\{/.test(line);

    if (functionDecl || arrowDecl || methodLike) {
      awaitingFunctionBrace = true;
    }

    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;

    for (let i = 0; i < opens; i++) {
      depth += 1;
      if (awaitingFunctionBrace) {
        functionDepthStack.push(depth);
        awaitingFunctionBrace = false;
      }
    }

    const isInsideFunction = functionDepthStack.some((d) => depth >= d);
    if (isInsideFunction && /^\s*export\s+/.test(line)) {
      return true;
    }

    for (let i = 0; i < closes; i++) {
      while (functionDepthStack.length && functionDepthStack[functionDepthStack.length - 1] >= depth) {
        functionDepthStack.pop();
      }
      depth = Math.max(0, depth - 1);
    }
  }

  return false;
};

export const testerAgent = async (files, tokenManager) => {
  const issues = [];
  const fileKeys = Object.keys(files || {});

  if (!fileKeys.length) {
    return { status: "failed", issues: ["No files generated"] };
  }

  // First pass: Strict JSX validation
  for (const path of fileKeys) {
    if (!/\.(js|jsx|ts|tsx)$/.test(path)) continue;
    const content = String(files[path] || "");

    // Validate JSX syntax in JS/JSX files - STRICT MODE
    const jsxError = validateJSXSyntax(content, path);
    if (jsxError) {
      return { status: "failed", issues: [`${path}:${jsxError.line} ${jsxError.reason}`] };
    }

    if (countDefaultExports(content) > 1) {
      return { status: "failed", issues: [`${path}: duplicate default exports found`] };
    }

    if (hasExportInsideFunction(content)) {
      return { status: "failed", issues: [`${path}: export statement found inside a function scope`] };
    }

    if (hasTopLevelReturn(content)) {
      return { status: "failed", issues: [`${path}: top-level return detected outside a component/function`] };
    }
  }

  // Continue with other validations if JSX is clean
  if (!files["index.html"]) {
    issues.push("Missing index.html entry file");
  }

  const hasSource = fileKeys.some((path) => /\.(js|jsx|ts|tsx)$/.test(path));
  if (!hasSource) {
    issues.push("Missing source file such as App.js or index.js");
  }

  if (!isRunnableAppFiles(files)) {
    issues.push("App output is not runnable or has invalid structure");
  }

  if (files["package.json"]) {
    const parsed = safeParseJSON(files["package.json"]);
    if (!parsed || typeof parsed !== "object") {
      issues.push("package.json is invalid JSON");
    }
  }

  for (const path of fileKeys) {
    if (!/\.(js|jsx|ts|tsx|css|html|json)$/.test(path)) continue;
    const content = String(files[path] || "");
    const imports = collectImports(content);
    for (const spec of imports) {
      if (!spec.startsWith(".") && !spec.startsWith("/")) continue;
      const resolved = resolveRelativeImport(path, spec);
      if (!fileExists(files, resolved)) {
        issues.push(`Missing local import ${spec} referenced from ${path}`);
      }
    }
  }

  return {
    status: issues.length ? "failed" : "passed",
    issues
  };
};
