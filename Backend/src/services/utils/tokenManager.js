import { MAX_TOKENS_PER_BUILD } from "../../config/constants.js";

export const createTokenManager = () => {
  let usedTokens = 0;

  const add = (tokens) => {
    usedTokens += tokens;

    if (usedTokens > MAX_TOKENS_PER_BUILD) {
      throw new Error("Token budget exceeded");
    }
  };

  return { add };
};