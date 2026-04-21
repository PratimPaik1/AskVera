import JSON5 from "json5";

function extractBalancedJsonBlock(input) {
  const firstObject = input.indexOf("{");
  const firstArray = input.indexOf("[");

  let start = -1;
  if (firstObject === -1 && firstArray === -1) return null;
  if (firstObject === -1) start = firstArray;
  else if (firstArray === -1) start = firstObject;
  else start = Math.min(firstObject, firstArray);

  const openChar = input[start];
  const closeChar = openChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = start; i < input.length; i++) {
    const ch = input[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (inString) {
      if (ch === quote) {
        inString = false;
        quote = "";
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === openChar) depth++;
    if (ch === closeChar) depth--;

    if (depth === 0) {
      return input.substring(start, i + 1);
    }
  }

  return null;
}

function autoCloseJsonCandidate(input) {
  const firstObject = input.indexOf("{");
  const firstArray = input.indexOf("[");

  let start = -1;
  if (firstObject === -1 && firstArray === -1) return null;
  if (firstObject === -1) start = firstArray;
  else if (firstArray === -1) start = firstObject;
  else start = Math.min(firstObject, firstArray);

  const raw = input.slice(start);
  const stack = [];
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (inString) {
      if (ch === quote) {
        inString = false;
        quote = "";
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if ((ch === "}" || ch === "]") && stack.length) stack.pop();
  }

  const suffix = stack.reverse().join("");
  return `${raw}${suffix}`;
}

export const safeParseJSON = (text) => {
  console.log("🟡 [JSON] Raw response");

  try {
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("Empty AI response");
    }

    // Remove markdown fences
    let cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Extract first balanced JSON block (object or array)
    const balanced = extractBalancedJsonBlock(cleaned);
    if (balanced) {
      cleaned = balanced;
    } else {
      const repaired = autoCloseJsonCandidate(cleaned);
      if (!repaired) {
        throw new Error("No complete JSON block found (response may be truncated)");
      }
      cleaned = repaired;
    }

    // Remove comments/backticks that often break strict parsers
    cleaned = cleaned
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    cleaned = cleaned.replace(/`/g, "");

    console.log("🟡 Cleaned JSON ready");

    const tryParse = (candidate) => JSON5.parse(candidate);

    let parsed;
    try {
      // JSON5 handles trailing commas and relaxed quotes
      parsed = tryParse(cleaned);
    } catch (primaryErr) {
      // Repair common LLM mistake: unquoted keys containing path chars (/, ., -)
      const repairedKeys = cleaned.replace(
        /([{\[,]\s*)([A-Za-z0-9_./-]+)\s*:/g,
        '$1"$2":'
      );
      parsed = tryParse(repairedKeys);
    }

    console.log("🟢 JSON parsed with JSON5");

    return parsed;

  } catch (err) {
    console.error("❌ JSON5 FAILED:", err?.message || "Unknown parse error");
    throw new Error("Failed to parse AI JSON: " + (err?.message || "Unknown parse error"));
  }
};
