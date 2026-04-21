import { plannerAgent } from "../services/agents/planner.agent.js";
import { coderAgent } from "../services/agents/coder.agent.js";
import { testerAgent } from "../services/agents/tester.agent.js";
import { createTokenManager } from "./utils/tokenManager.js";
import { BUILD_SKIP_TESTER, MAX_RETRIES } from "../config/constants.js";
import { createFallbackFiles } from "./utils/fallbackBuild.js";
import { ensureWorkingAppFiles, isRunnableAppFiles } from "./utils/appSanity.js";

const buildCache = new Map();

const normalizePrompt = (prompt) =>
  String(prompt || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const isSimplePrompt = (prompt) => {
  const text = normalizePrompt(prompt);
  if (!text) return false;
  if (text.length < 80 && !/\b(login|auth|database|api|backend|payment|analytics|integration|dashboard|chat|realtime|socket|persist|storage|upload|download|admin|user profile|admin panel)\b/.test(text)) {
    return true;
  }
  return /\b(todo|counter|calculator|landing page|about page|contact form|static page|single page|profile card|faq page|timer|quote generator|weather app)\b/.test(text);
};

export const runBuildPipeline = async (prompt, context = {}, options = {}) => {
  const onProgress = typeof options?.onProgress === "function" ? options.onProgress : () => {};
  const skipTester = options?.skipTester ?? BUILD_SKIP_TESTER;
  const tokenManager = createTokenManager();
  const previousFilesMap = Array.isArray(context?.previousFiles)
    ? context.previousFiles.reduce((acc, file) => {
        if (file?.filename) acc[file.filename] = file.content || "";
        return acc;
      }, {})
    : {};

  const mergeWithPrevious = (files) =>
    Object.keys(previousFilesMap).length ? { ...previousFilesMap, ...(files || {}) } : (files || {});

  const buildFallback = async (reason) => {
    const fallbackFiles = await createFallbackFiles(prompt, reason, context);
    const repaired = ensureWorkingAppFiles(mergeWithPrevious(fallbackFiles));
    if (!isRunnableAppFiles(repaired)) {
      throw new Error("Fallback did not produce runnable app files");
    }
    return repaired;
  };

  const promptKey = normalizePrompt(prompt);
  if (buildCache.has(promptKey)) {
    onProgress({ stage: "cache", message: "Returning cached app build." });
    return { files: buildCache.get(promptKey) };
  }

  const directBuild = isSimplePrompt(prompt);
  if (directBuild) {
    onProgress({ stage: "direct", message: "Simple prompt detected. Generating directly from coder..." });
    try {
      const code = await coderAgent({
        prompt,
        plan: null,
        architecture: null,
        previousCode: null,
        issues: null,
        context,
        tokenManager
      });
      const merged = ensureWorkingAppFiles(mergeWithPrevious(code.files));
      if (!isRunnableAppFiles(merged)) {
        onProgress({ stage: "fallback", message: "Direct build incomplete, trying recovery build..." });
        return { files: await buildFallback("Direct build incomplete") };
      }
      buildCache.set(promptKey, merged);
      return { files: merged };
    } catch (err) {
      onProgress({ stage: "fallback", message: "Direct generation failed, trying recovery build..." });
      return { files: await buildFallback(err?.message || "Direct coder failed") };
    }
  }

  onProgress({ stage: "planning", message: "Planning implementation..." });
  const planPromise = plannerAgent(prompt, tokenManager, context);
  onProgress({ stage: "coding", message: "Generating initial app files..." });
  const codePromise = coderAgent({
    prompt,
    plan: null,
    architecture: null,
    previousCode: null,
    issues: null,
    context,
    tokenManager
  });

  const [planResult, codeResult] = await Promise.allSettled([planPromise, codePromise]);

  let plan = null;
  let architecture = null;
  let code = null;

  if (planResult.status === "fulfilled" && planResult.value?.status === "success") {
    plan = planResult.value.data;
    architecture = plan.architecture || null;
  } else if (planResult.status === "rejected") {
    onProgress({ stage: "warning", message: "Planner returned an error; continuing with coder output if available." });
  }

  if (codeResult.status === "fulfilled") {
    code = codeResult.value;
  } else {
    if (plan) {
      onProgress({ stage: "retry", message: "Initial coder failed. Retrying with plan guidance..." });
      try {
        code = await coderAgent({
          prompt,
          plan,
          architecture,
          previousCode: null,
          issues: null,
          context,
          tokenManager
        });
      } catch (err) {
        onProgress({ stage: "fallback", message: "Code generation failed after retry, trying recovery build..." });
        return { files: await buildFallback(err?.message || "Coder generation failed") };
      }
    } else {
      onProgress({ stage: "fallback", message: "Code generation failed, trying recovery build..." });
      return { files: await buildFallback(codeResult.reason?.message || "Coder generation failed") };
    }
  }

  code.files = mergeWithPrevious(code.files);
  const codeFiles = ensureWorkingAppFiles(code.files);

  if (skipTester) {
    onProgress({ stage: "finalizing", message: "Finalizing build (fast mode)..." });
    if (!isRunnableAppFiles(codeFiles)) {
      onProgress({ stage: "fallback", message: "Generated output incomplete, trying recovery build..." });
      return { files: await buildFallback("Generated output incomplete") };
    }
    buildCache.set(promptKey, codeFiles);
    return { files: codeFiles };
  }

  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    onProgress({ stage: "testing", message: "Validating generated app..." });
    const testResult = await testerAgent(codeFiles, tokenManager);

    if (testResult.status === "passed") {
      onProgress({ stage: "finalizing", message: "Build validated. Finalizing..." });
      buildCache.set(promptKey, codeFiles);
      return { files: codeFiles };
    }

    if (attempt === MAX_RETRIES) {
      break;
    }

    onProgress({ stage: "fixing", message: "Fixing issues found during validation..." });
    try {
      const patched = await coderAgent({
        prompt,
        plan,
        architecture,
        previousCode: { files: codeFiles },
        issues: testResult.issues,
        context,
        tokenManager
      });
      code.files = mergeWithPrevious(patched.files);
      Object.assign(codeFiles, ensureWorkingAppFiles(code.files));
    } catch (err) {
      onProgress({ stage: "fallback", message: "Fix attempt failed, trying recovery build..." });
      return { files: await buildFallback(err?.message || "Coder patch failed") };
    }

    attempt += 1;
  }

  onProgress({ stage: "finalizing", message: "Finalizing latest generated build..." });
  if (!isRunnableAppFiles(codeFiles)) {
    onProgress({ stage: "fallback", message: "Final output incomplete, trying recovery build..." });
    return { files: await buildFallback("Final output incomplete") };
  }

  buildCache.set(promptKey, codeFiles);
  return { files: codeFiles };
};
