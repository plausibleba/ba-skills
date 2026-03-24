import { useState, useEffect, useCallback, useRef } from "react";

// ─── Wait Puzzle ─────────────────────────────────────────────────────────────
// A mini word-unscramble game shown during scaffold generation to keep the user
// engaged while the pipeline runs. Themed around business/operating model terms.

const WORD_BANK = [
  { word: "CAPABILITY", hint: "An enduring business ability" },
  { word: "SCAFFOLD", hint: "The structural skeleton of a model" },
  { word: "FRICTION", hint: "What slows a process down" },
  { word: "GOVERNANCE", hint: "Rules and oversight framework" },
  { word: "LIFECYCLE", hint: "Birth to retirement of an object" },
  { word: "STAKEHOLDER", hint: "Someone with skin in the game" },
  { word: "PIPELINE", hint: "A series of processing stages" },
  { word: "DISCOVERY", hint: "The process of uncovering insights" },
  { word: "TRANSFORM", hint: "To change form or structure" },
  { word: "OPERATING", hint: "___ model — how a business runs" },
  { word: "STRATEGY", hint: "A plan to achieve a long-term goal" },
  { word: "OUTCOME", hint: "The result of a process stage" },
  { word: "DIAGNOSTIC", hint: "An assessment to identify issues" },
  { word: "CONSTRAINT", hint: "A limiting factor or boundary" },
  { word: "ACTIVITY", hint: "A unit of work in a value stream" },
  { word: "METRIC", hint: "A measure of performance" },
  { word: "DOMAIN", hint: "A sphere of knowledge or influence" },
  { word: "CONCEPT", hint: "An abstract idea or building block" },
  { word: "ENRICHMENT", hint: "Adding depth and detail" },
  { word: "HIERARCHY", hint: "A ranked ordering of levels" },
];

function scramble(word: string): string {
  const arr = word.split("");
  // Fisher-Yates shuffle, but ensure result differs from original
  for (let attempt = 0; attempt < 20; attempt++) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (arr.join("") !== word) break;
  }
  return arr.join("");
}

function pickRandom<T>(arr: T[], exclude?: Set<number>): [T, number] {
  const available = arr.map((v, i) => [v, i] as [T, number]).filter(([, i]) => !exclude?.has(i));
  return available[Math.floor(Math.random() * available.length)];
}

export default function WaitPuzzle({ step }: { step: string }) {
  const usedIndices = useRef(new Set<number>());
  const [current, setCurrent] = useState(() => {
    const [entry, idx] = pickRandom(WORD_BANK);
    usedIndices.current.add(idx);
    return { ...entry, scrambled: scramble(entry.word), index: idx };
  });
  const [guess, setGuess] = useState("");
  const [solved, setSolved] = useState(0);
  const [showResult, setShowResult] = useState<"correct" | "skip" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const nextWord = useCallback(() => {
    if (usedIndices.current.size >= WORD_BANK.length) {
      usedIndices.current.clear(); // reset if we've used all words
    }
    const [entry, idx] = pickRandom(WORD_BANK, usedIndices.current);
    usedIndices.current.add(idx);
    setCurrent({ ...entry, scrambled: scramble(entry.word), index: idx });
    setGuess("");
    setShowResult(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (guess.toUpperCase().trim() === current.word) {
      setSolved((s) => s + 1);
      setShowResult("correct");
      setTimeout(nextWord, 800);
    }
  }, [guess, current.word, nextWord]);

  const handleSkip = useCallback(() => {
    setShowResult("skip");
    setTimeout(nextWord, 1200);
  }, [nextWord]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSubmit();
      if (e.key === "Escape") handleSkip();
    },
    [handleSubmit, handleSkip]
  );

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [current.index]);

  const stepLabel =
    step === "scaffold" ? "Building scaffold" :
    step === "validating" ? "Validating" :
    step === "subactivities" ? "Deepening structure" :
    step === "ppit" ? "Mapping PPIT" :
    step === "cards" ? "Generating cards" :
    step === "enriching" ? "Enriching" :
    "Generating";

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 max-w-md mx-auto">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-medium text-slate-500">
            {stepLabel}… {mins > 0 ? `${mins}m ` : ""}{secs.toString().padStart(2, "0")}s
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          {solved} solved
        </span>
      </div>

      {/* Game area */}
      <div className="text-center space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
          Unscramble the word
        </p>

        {/* Scrambled letters */}
        <div className="flex justify-center gap-1 flex-wrap">
          {current.scrambled.split("").map((ch, i) => (
            <span
              key={`${current.index}-${i}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-700 border border-slate-200 select-none"
              style={{
                animation: `popIn 0.15s ease-out ${i * 0.03}s both`,
              }}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* Hint */}
        <p className="text-[11px] text-slate-400 italic">
          {current.hint}
        </p>

        {/* Result flash */}
        {showResult === "correct" && (
          <p className="text-xs font-semibold text-emerald-600 animate-pulse">Correct!</p>
        )}
        {showResult === "skip" && (
          <p className="text-xs font-medium text-amber-600">
            It was <span className="font-bold">{current.word}</span>
          </p>
        )}

        {/* Input */}
        {!showResult && (
          <div className="flex items-center gap-2 justify-center">
            <input
              ref={inputRef}
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer…"
              className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-center font-medium text-slate-700 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={handleSubmit}
              disabled={!guess.trim()}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-slate-700 disabled:opacity-30 transition-all"
            >
              Go
            </button>
            <button
              onClick={handleSkip}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-medium text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
            >
              Skip
            </button>
          </div>
        )}
      </div>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5) translateY(4px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
