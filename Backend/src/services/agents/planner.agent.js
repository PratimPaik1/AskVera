import { aiCall } from "../utils/aiClient.js";
import { safeParseJSON } from "../utils/jsonParser.js";

const REACT_PLAN_GUARDRAILS = `React output guardrails:
- Plan files so implementation compiles without syntax errors.
- Avoid conflicting or duplicate implementations of the same feature.
- Ensure component/module layout supports a single default export per file.
- Avoid patterns that place exports inside functions.
- Keep architecture minimal and runnable (Sandpack friendly).`;

const parsePlannerPayload = (rawContent) => {
  const parsed = safeParseJSON(rawContent);
  if (!parsed) {
    throw new Error("Planner agent returned invalid JSON");
  }

  if (parsed.status === "error") {
    throw new Error(parsed.errors?.join("; ") || "Planner agent returned error status");
  }

  if (parsed.data?.tasks && Array.isArray(parsed.data.tasks)) {
    return {
      status: "success",
      data: {
        tasks: parsed.data.tasks,
        architecture: parsed.data.architecture || { files: [] }
      },
      errors: parsed.errors || []
    };
  }

  if (parsed.tasks) {
    return {
      status: "success",
      data: {
        tasks: parsed.tasks,
        architecture: parsed.architecture || { files: [] }
      },
      errors: []
    };
  }

  throw new Error("Planner output missing tasks or architecture");
};

export const plannerAgent = async (prompt, tokenManager, context = {}) => {
  const previousPrompts = Array.isArray(context?.recentPrompts) ? context.recentPrompts : [];

  const res = await aiCall([
    {
      role: "system",
      content:
        `You are a senior product engineer. Produce a minimal runnable plan and architecture for the request.
${REACT_PLAN_GUARDRAILS}
Return ONLY valid JSON with this shape: {"status":"success|error","data":{"tasks":[{"title":"string","description":"string"}],"architecture":{"files":[{"path":"string","purpose":"string"}]}},"errors":["string"]}. No markdown, no explanation. Keep output brief.`
    },
    {
      role: "user",
      content: `Prompt:\n${prompt}\n\nRecent prompts:\n${JSON.stringify(previousPrompts)}`
    }
  ]);

  tokenManager.add(res.tokens);

  return parsePlannerPayload(res.content);
};
