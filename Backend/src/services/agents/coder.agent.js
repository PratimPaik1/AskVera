import { aiCall } from "../utils/aiClient.js";
import { safeParseJSON } from "../utils/jsonParser.js";

const REACT_FIX_RULES = `React code quality rules (mandatory):
1. Fix all syntax errors (JSX, template literals, missing brackets).
2. Ensure only ONE export default exists per file.
3. Never place export statements inside functions.
4. Ensure valid component structure:
   - Define components at module scope unless nesting is necessary
   - App must return JSX from a valid component function
5. Fix invalid className template strings using backticks.
6. Remove duplicated/conflicting code blocks.
7. Do not mix multiple implementations in one file.
8. Preserve requested functionality.
9. Return complete working file content for every file you output.
10. No placeholders or TODO stubs.

Validation checklist before output:
- No syntax errors
- React-compilable (Vite/CRA compatible)
- No duplicate default exports
- Valid JSX`;

const hasRunnableFiles = (files) => {
  if (!files || typeof files !== "object" || Array.isArray(files)) return false;
  const keys = Object.keys(files);
  if (keys.length < 2) return false;
  const hasSource = keys.some((k) => /(^index\.html$)|(^src\/.*\.(js|jsx|ts|tsx|css|html)$)|(^script\.js$)|(^style\.css$)/i.test(k));
  const onlyMeta = keys.every((k) => /(package\.json|tsconfig\.json|vite\.config\.(js|ts)|readme\.md|\.eslintrc(\.json)?|\.prettierrc)$/i.test(k));
  return hasSource && !onlyMeta;
};

const normalizeCoderPayload = (parsed) => {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Coder output is not valid JSON");
  }

  if (parsed.status === "error") {
    throw new Error(parsed.errors?.join("; ") || "Coder agent returned error status");
  }

  if (parsed.data?.files && typeof parsed.data.files === "object") {
    return { status: "success", files: parsed.data.files };
  }

  if (parsed.files && typeof parsed.files === "object") {
    return { status: "success", files: parsed.files };
  }

  throw new Error("Coder output missing files object");
};

const tryParseCoderPayload = async (rawContent, tokenManager) => {
  try {
    return normalizeCoderPayload(safeParseJSON(rawContent));
  } catch (parseError) {
    const repair = await aiCall([
      {
        role: "system",
        content:
          'You are a JSON repair assistant. Convert the given broken output into valid JSON only. Output exact shape: {"status":"success","data":{"files":{"path/to/file.ext":"file content"}},"errors":[]}. No markdown, no explanation.'
      },
      {
        role: "user",
        content: rawContent
      }
    ]);

    tokenManager.add(repair.tokens);
    return normalizeCoderPayload(safeParseJSON(repair.content));
  }
};

export const coderAgent = async ({
  prompt,
  plan,
  architecture,
  previousCode,
  issues,
  context,
  tokenManager
}) => {
  const isPatchAttempt = Boolean(issues || previousCode);

  const baseUserPrompt = `Prompt: ${prompt}\n\n${
    plan ? `Plan: ${JSON.stringify(plan)}\n\n` : "Plan: none available. Infer minimal runnable structure from the prompt.\n\n"
  }${
    architecture
      ? `Architecture: ${JSON.stringify(architecture)}\n\n`
      : "Architecture: none available. Use only required files.\n\n"
  }Recent prompts: ${JSON.stringify(context?.recentPrompts || [])}\n\n${
    issues ? `Fix issues:\n${JSON.stringify(issues)}\n\n` : ""
  }${
    previousCode ? "If fixing existing output, return only changed or new files, not a full rewrite.\n\n" : ""
  }${REACT_FIX_RULES}\n\nReturn ONLY valid JSON with this exact shape: {\"status\":\"success\",\"data\":{\"files\":{\"path/to/file.ext\":\"file content\"}},\"errors\":[]}. No markdown, no explanation.`;

  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const retryHint =
      attempt === 0
        ? ""
        : `\nPrevious response was invalid or truncated. Return valid JSON only, shorter if needed. No markdown.`;

    const res = await aiCall([
      {
        role: "system",
        content:
          `You are a senior full-stack engineer and strict React code reviewer.
Generate a complete working app or patch the existing app if issues are provided.
Use only required files: index.html, App.js, index.js, styles.css, and minimal config files.
If patching existing output, return only changed or new files.

${REACT_FIX_RULES}

Output ONLY valid JSON in shape: {"status":"success","data":{"files":{"path/to/file.ext":"file content"}},"errors":[]}. No markdown, no explanation.`
      },
      {
        role: "user",
        content: `${baseUserPrompt}${retryHint}`
      }
    ]);

    tokenManager.add(res.tokens);

    try {
      const parsed = await tryParseCoderPayload(res.content, tokenManager);
      if (!parsed.files || typeof parsed.files !== "object") {
        throw new Error("Invalid coder output: missing files object");
      }
      if (!isPatchAttempt && !hasRunnableFiles(parsed.files)) {
        throw new Error("Invalid coder output: incomplete runnable files");
      }
      return parsed;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Coder agent failed to return valid JSON");
};
