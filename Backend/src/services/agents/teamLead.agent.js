import { aiCall } from "../utils/aiClient.js";
import { safeParseJSON } from "../utils/jsonParser.js";

const REACT_ARCH_GUARDRAILS = `React architecture guardrails:
- Return a single coherent implementation path (no parallel conflicting file sets).
- Keep file layout compatible with valid component/module structure.
- Avoid designs that imply duplicate default exports or exports inside functions.
- Prioritize minimal runnable architecture.`;

const parseTeamLeadPayload = (rawContent) => {
  const parsed = safeParseJSON(rawContent);
  if (!parsed) {
    throw new Error("TeamLead agent returned invalid JSON");
  }

  if (parsed.status === "error") {
    throw new Error(parsed.errors?.join("; ") || "TeamLead agent returned error status");
  }

  if (parsed.data?.files) {
    return {
      status: "success",
      data: { files: parsed.data.files },
      errors: parsed.errors || []
    };
  }

  if (parsed.files) {
    return {
      status: "success",
      data: { files: parsed.files },
      errors: []
    };
  }

  throw new Error("TeamLead output missing files");
};

export const teamLeadAgent = async (plan, tokenManager, context = {}) => {
  const previousPrompts = Array.isArray(context?.recentPrompts) ? context.recentPrompts : [];

  const res = await aiCall([
    {
      role: "system",
      content:
        `You are a principal architect. Review the plan and return only a minimal runnable file architecture.
${REACT_ARCH_GUARDRAILS}
Use strict JSON only: {"status":"success|error","data":{"files":[{"path":"string","purpose":"string"}]}},"errors":["string"]. No markdown, no explanation.`
    },
    {
      role: "user",
      content: `Plan:\n${JSON.stringify(plan)}\n\nRecent prompts:\n${JSON.stringify(previousPrompts)}`
    }
  ]);

  tokenManager.add(res.tokens);

  return parseTeamLeadPayload(res.content);
};
