import { useState } from "react";

const THEME_STYLES = {
  dark: {
    container: "bg-[#0b0f19] border-white/10",
    input:
      "bg-white/5 border-white/15 text-white placeholder:text-gray-500 focus:border-orange-400",
    hint: "text-gray-400",
  },
  light: {
    container: "bg-white border-[#f2d8b7]",
    input:
      "bg-[#fff9ef] border-[#f3dfc5] text-[#2a241d] placeholder:text-[#a7865f] focus:border-orange-400",
    hint: "text-[#8a6c4b]",
  },
};

export default function PromptBar({ onSubmit, loading, theme = "dark" }) {
  const [input, setInput] = useState("");
  const styles = THEME_STYLES[theme] || THEME_STYLES.dark;

  const handleSubmit = () => {
    if (!input.trim() || loading) return;
    onSubmit(input.trim());
    setInput("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`rounded-2xl border p-3 sm:p-4 ${styles.container}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className={`w-full flex-1 rounded-xl border px-3 py-3 text-sm outline-none transition ${styles.input}`}
          placeholder="AskVera: Build a pricing page with FAQ and contact form"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="rounded-xl px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-orange-400 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 transition"
        >
          {loading ? "Running..." : "Run Prompt"}
        </button>
      </div>
      <p className={`mt-2 text-xs ${styles.hint}`}>
        Press Enter to run. Use detailed prompts for better file generation.
      </p>
    </div>
  );
}
