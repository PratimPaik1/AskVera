import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";

const resolveMistralApiKey = () => {
  const apiKey =
    process.env.MISTRAL_API_KEY ||
    process.env.MISTRAL_API ||
    process.env.MISTAL_API_KEY;

  if (typeof apiKey === "string" && apiKey.trim()) {
    return apiKey.trim();
  }

  return "";
};

const normalizeText = (value) => {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && typeof item.text === "string") return item.text;
        return "";
      })
      .join("");
  }

  if (value && typeof value === "object" && typeof value.text === "string") {
    return value.text;
  }

  if (value == null) return "";
  return String(value);
};

export const aiCall = async (messages, options = {}) => {
  const { jsonMode = true, maxTokens = 7000 } = options;

  const apiKey = resolveMistralApiKey();

  if (!apiKey) {
    throw new Error("Mistral API key missing (set MISTRAL_API_KEY or MISTRAL_API)");
  }

  const model = new ChatMistralAI({
    apiKey,
    model: process.env.MISTRAL_MODEL || "mistral-small-latest",
    temperature: 0.2,
    maxTokens
  });

  try {
    // Convert messages to LangChain format
    const langChainMessages = messages.map(msg => {
      const content = normalizeText(msg?.content);
      switch (msg.role) {
        case "system":
          return new SystemMessage(content);
        case "user":
          return new HumanMessage(content);
        case "assistant":
          return new AIMessage(content);
        default:
          return new HumanMessage(content);
      }
    });

    // Force machine-readable output when requested.
    if (jsonMode) {
      const jsonInstruction = "Respond with valid JSON only.";
      const firstMessage = langChainMessages[0];

      if (firstMessage instanceof SystemMessage) {
        const mergedContent = `${normalizeText(firstMessage.content)}\n\n${jsonInstruction}`.trim();
        langChainMessages[0] = new SystemMessage(mergedContent);
      } else {
        langChainMessages.unshift(new SystemMessage(jsonInstruction));
      }
    }

    const response = await model.invoke(langChainMessages);

    const content = normalizeText(response?.content).trim();

    if (!content) {
      throw new Error("AI returned empty content");
    }

    return {
      content,
      tokens: response.usage_metadata?.total_tokens || 0
    };

  } catch (err) {
    if (err?.status === 401 || err?.code === 401) {
      throw new Error("Mistral API Unauthorized (Check API Key)");
    }
    throw new Error(`AI call failed: ${err.message}`);
  }
};
