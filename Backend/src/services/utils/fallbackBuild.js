import { aiCall } from "./aiClient.js";

const REACT_FIX_RULES = `React code quality rules (mandatory):
- Fix all syntax errors (JSX, template literals, missing brackets).
- Ensure only ONE export default exists per file.
- Never place export statements inside functions.
- Ensure valid component structure and valid JSX return flow.
- Fix invalid className template strings using backticks.
- Remove duplicated/conflicting code blocks.
- Do not mix multiple implementations in one file.
- Preserve requested functionality.
- Return complete working file content (no placeholders).`;

function safeToText(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function extractImportPath(importStmt) {
  if (typeof importStmt !== "string") return null;
  const match = importStmt.match(/from\s+['"]([^'"]+)['"]/);
  const importPath = match?.[1];
  if (typeof importPath !== "string") return null;
  const trimmed = importPath.trim();
  return trimmed || null;
}

function parseFileMarkers(raw) {
  const files = {};
  const regex = /<<FILE:([^\n>]+)>>\n([\s\S]*?)\n<<END_FILE>>/g;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    const filename = String(match[1] || "").trim();
    const content = String(match[2] || "");
    if (!filename) continue;
    files[filename] = content;
  }

  return Object.keys(files).length ? files : null;
}

function extractJsonObject(text) {
  const raw = safeToText(text).trim();
  if (!raw) return null;

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]);
    } catch {
      // Continue with generic extraction below.
    }
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const maybeJson = raw.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(maybeJson);
    } catch {
      return null;
    }
  }

  return null;
}

function isValidGeneratedFiles(files) {
  if (!files || typeof files !== "object") return false;
  const names = Object.keys(files);
  if (!names.length) return false;

  const hasScriptEntry = names.some((name) => /\.(js|jsx|ts|tsx)$/i.test(name));
  const hasHtml = names.includes("index.html");
  return hasScriptEntry || hasHtml;
}

export async function createFallbackFiles(prompt, reason, context = {}) {
  const userPrompt = String(prompt || "").trim();
  const failureReason = String(reason || "Build generation failed");
  const recentPrompts = Array.isArray(context?.recentPrompts) ? context.recentPrompts : [];

  for (let attempt = 0; attempt < 5; attempt++) {
    const tighten =
      attempt === 0
        ? ""
        : "\nKeep implementation smaller and concise. Use fewer files while still fully working.";

    let res;
    try {
      res = await aiCall([
        {
          role: "system",
          content:
            `You are a React app generator for Sandpack. Generate a complete app that implements the user's requested functionality. Return ONLY JSON in this format:
{
  "files": {
    "index.html": "...",
    "index.js": "...",
    "App.js": "...",
    "styles.css": "..."
  }
}

STRICT RULES:
- Build a real functional app UI, not a requirements checklist or placeholder summary.
- Include requested interactions, loading states, and error states when asked.
- index.html MUST include: <script type="module" src="/index.js"></script>
- If you add extra files, they must be listed in files and imported correctly.
- Every imported file MUST exist
- No missing modules
- Preserve user intent and requested features, not a generic demo app.
- Validate all imports and paths before output.

${REACT_FIX_RULES}`
        },
        {
          role: "user",
          content:
            `Generate a React app for this prompt:\n${userPrompt}\n\nContext:\n${JSON.stringify(recentPrompts)}\n\nPrevious failure:\n${failureReason}\n\nEnsure the app works in Sandpack with the exact file structure required.\nThis fallback must still fully implement the user's exact request.${tighten}`
        }
      ], { jsonMode: true, maxTokens: 4000 });
    } catch {
      // AI call failed on this attempt, keep trying and fall back to defaults.
      continue;
    }

    try {
      const parsed = extractJsonObject(String(res?.content || "")) || JSON.parse(String(res?.content || "{}"));
      if (isValidGeneratedFiles(parsed?.files)) {

        // Validate the generated files
        const files = parsed.files;

        // Check index.html script tag only when index.html exists.
        if (files["index.html"] && !safeToText(files["index.html"]).includes('<script type="module" src="/index.js"></script>')) {
          continue;
        }

        // Basic import validation
        const allContent = Object.values(files).map(safeToText).join('\n');
        const imports = allContent.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g) || [];
        const hasInvalidImports = imports.some(imp => {
          const importPath = extractImportPath(imp);
          if (!importPath) return false;

          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const expectedFile = importPath.replace(/^\.\//, '').replace(/^\.\.\//, '');
            if (!expectedFile) {
              return true;
            }
            if (!files[expectedFile] && !files[expectedFile + '.js'] && !files[expectedFile + '.jsx']) {
              return true; // Invalid import
            }
          }
          return false;
        });

        if (hasInvalidImports) {
          continue; // Invalid imports, try again
        }

        return files;
      }

      const markedFiles = parseFileMarkers(String(res?.content || ""));
      if (isValidGeneratedFiles(markedFiles)) {
        return markedFiles;
      }
    } catch (e) {
      // JSON parse failed, try again
      continue;
    }
  }

  throw new Error(`Fallback generation failed for prompt-specific app: ${failureReason}`);
}
