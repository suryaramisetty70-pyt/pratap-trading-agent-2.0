import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Volume2,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldCheck,
  TrendingUp,
  HelpCircle,
  Globe,
  Sliders,
} from "lucide-react";
import { WhyButton } from "./AiCopilot";

export type AiBlockMode = "simple" | "pro";
export type AiBlockLanguage = "English" | "Telugu-English" | "Hindi-English";

export interface IndividualAiBlockProps {
  symbol: string;
  section: string;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  stockData?: any;
  mlData?: any;
  defaultExpanded?: boolean;
  className?: string;
  suggestedWhyMetrics?: string[];
}

export function IndividualAiBlock({
  symbol,
  section,
  title,
  subtitle = "Institutional AI Explainability and 10-Year Quant Market Analysis",
  badgeLabel,
  stockData,
  mlData,
  defaultExpanded = true,
  className = "",
  suggestedWhyMetrics = ["rsi", "target_1", "stop_loss"],
}: IndividualAiBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [mode, setMode] = useState<AiBlockMode>("simple");
  const [language, setLanguage] = useState<AiBlockLanguage>("English");
  const [loading, setLoading] = useState(false);
  const [explanationData, setExplanationData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const fetchExplanation = async () => {
    setLoading(true);
    const customKey = localStorage.getItem("user_groq_api_key") || "";
    try {
      const res = await fetch("/api/copilot/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: symbol,
          section,
          mode,
          language,
          api_key: customKey,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setExplanationData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplanation();
  }, [symbol, section, mode, language]);

  const handleCopy = () => {
    if (explanationData?.explanation) {
      navigator.clipboard.writeText(explanationData.explanation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleSpeech = () => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      const textToSpeak =
        explanationData?.explanation?.replace(/[#*•_`]/g, "") || "";
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    }
  };

  const badge = badgeLabel || explanationData?.badge || "MIXED";
  const badgeColor =
    badge === "POSITIVE"
      ? "bg-bull/15 text-bull border-bull/30"
      : badge === "NEGATIVE"
      ? "bg-bear/15 text-bear border-bear/30"
      : "bg-amber-400/15 text-amber-400 border-amber-400/30";

  return (
    <div
      className={`rounded-lg border border-primary/40 bg-gradient-to-br from-primary/5 via-secondary/40 to-background shadow-lg overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 border-b border-border/70 bg-secondary/30">
        <div className="flex items-center gap-2.5">
          <div className="grid size-7 place-items-center rounded-md bg-primary/20 text-primary">
            <Sparkles className="size-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold tracking-wider text-foreground uppercase">
                {title}
              </h3>
              <span
                className={`rounded px-2 py-0.5 text-[0.55rem] font-bold border tracking-wider uppercase ${badgeColor}`}
              >
                {badge}
              </span>
            </div>
            <p className="text-[0.62rem] text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Mode Pill Toggle */}
          <div className="flex items-center rounded-md border border-border bg-secondary/80 p-0.5 text-[0.58rem] font-semibold">
            <button
              onClick={() => setMode("simple")}
              className={`rounded px-2 py-0.5 uppercase transition ${
                mode === "simple"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => setMode("pro")}
              className={`rounded px-2 py-0.5 uppercase transition ${
                mode === "pro"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pro Quant
            </button>
          </div>

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as AiBlockLanguage)}
            className="rounded-md border border-border bg-secondary/80 px-2 py-1 text-[0.62rem] font-semibold text-foreground outline-none cursor-pointer"
          >
            <option value="English">English</option>
            <option value="Telugu-English">Telugu (తెలుగు)</option>
            <option value="Hindi-English">Hindi (हिंदी)</option>
          </select>

          {/* Voice Speak */}
          <button
            onClick={toggleSpeech}
            className={`rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition ${
              speaking ? "text-primary animate-pulse" : ""
            }`}
            title="Read out explanation with voice"
          >
            <Volume2 className="size-3.5" />
          </button>

          {/* Copy Explanation */}
          <button
            onClick={handleCopy}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition"
            title="Copy AI explanation"
          >
            {copied ? (
              <Check className="size-3.5 text-bull" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>

          {/* Refresh Engine */}
          <button
            onClick={fetchExplanation}
            disabled={loading}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary transition disabled:opacity-50"
            title="Refresh AI Analysis"
          >
            <RefreshCw
              className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`}
            />
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            title={expanded ? "Collapse AI Block" : "Expand AI Block"}
          >
            {expanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content Body */}
      {expanded && (
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
              <RefreshCw className="size-5 animate-spin text-primary" />
              <p className="font-semibold tracking-wider uppercase text-[0.65rem]">
                Synthesizing 10-Year Market Cycle and Quant Literature...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Formatted Explanation Content */}
              <div className="rounded-md bg-secondary/30 p-3.5 border border-border/50 text-[0.74rem] leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                {explanationData?.explanation || (
                  <p className="text-muted-foreground italic">
                    AI explanation ready. Select options above to view real-time insights.
                  </p>
                )}
              </div>

              {/* Bottom Quick-Inspect Chips */}
              {suggestedWhyMetrics && suggestedWhyMetrics.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[0.6rem] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <HelpCircle className="size-3 text-primary" /> Ask Deep Rationale:
                  </span>
                  {suggestedWhyMetrics.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 rounded bg-secondary/60 px-2 py-0.5 text-[0.6rem] text-foreground font-semibold border border-border/60"
                    >
                      <span>Why {m.replace(/_/g, " ").toUpperCase()}?</span>
                      <WhyButton metric={m} symbol={symbol} />
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
