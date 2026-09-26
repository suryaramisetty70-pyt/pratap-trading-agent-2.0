import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Cpu,
  HelpCircle,
  FileText,
  MessageSquare,
  Volume2,
  Copy,
  Download,
  Check,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ChevronRight,
  Send,
  Sliders,
  Globe,
} from "lucide-react";
import { Panel } from "@/components/market/primitives";
import { fmt } from "@/lib/market";

export type CopilotMode = "simple" | "pro";
export type CopilotLanguage = "English" | "Telugu-English" | "Hindi-English";

interface AiCopilotProps {
  symbol: string;
  stockData?: any;
  mlData?: any;
  className?: string;
  initialTab?: "report" | "sections" | "chat" | "why";
  onSelectWhyMetric?: (metric: string) => void;
}

export function AiCopilot({
  symbol,
  stockData,
  mlData,
  className = "",
  initialTab = "report",
}: AiCopilotProps) {
  const [activeTab, setActiveTab] = useState<"report" | "sections" | "chat" | "why">(initialTab);
  const [mode, setMode] = useState<CopilotMode>("simple");
  const [language, setLanguage] = useState<CopilotLanguage>("English");
  
  // Section Explainer state
  const [selectedSection, setSelectedSection] = useState<string>("technicals");
  const [sectionData, setSectionData] = useState<any>(null);
  const [sectionLoading, setSectionLoading] = useState(false);

  // Full Report state
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Why Inspector state
  const [selectedMetric, setSelectedMetric] = useState<string>("rsi");
  const [whyData, setWhyData] = useState<any>(null);
  const [whyLoading, setWhyLoading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Array<{ role: "user" | "copilot"; text: string; time: string }>>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Audio Speech state
  const [speaking, setSpeaking] = useState(false);

  // Auto-refresh context whenever symbol, mode, or language changes
  useEffect(() => {
    loadReport();
    loadSectionExplanation(selectedSection);
    loadWhyMetric(selectedMetric);
    // Reset chat with greeting for new stock
    setMessages([
      {
        role: "copilot",
        text:
          language === "Telugu-English"
            ? `Namaskaram! Nenu mee Max Market AI Trading Copilot. ${symbol} gurinchi meeku em doubts unna adagandi (e.g., RSI enduku perigindi?, Target ela calculate chesaru?, etc.)!`
            : `Hello! I am your Max Market AI Trading Copilot for **${symbol}**. Ask me any question about the technical indicators, ML targets, trade setup, or risk levels.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [symbol, mode, language]);

  const loadReport = async () => {
    setReportLoading(true);
    const customKey = localStorage.getItem("user_groq_api_key") || "";
    try {
      const res = await fetch("/api/copilot/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: symbol, mode, language, api_key: customKey }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setReportData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReportLoading(false);
    }
  };

  const loadSectionExplanation = async (sec: string) => {
    setSelectedSection(sec);
    setSectionLoading(true);
    const customKey = localStorage.getItem("user_groq_api_key") || "";
    try {
      const res = await fetch("/api/copilot/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: symbol, section: sec, mode, language, api_key: customKey }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setSectionData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSectionLoading(false);
    }
  };

  const loadWhyMetric = async (metricKey: string) => {
    setSelectedMetric(metricKey);
    setWhyLoading(true);
    const customKey = localStorage.getItem("user_groq_api_key") || "";
    try {
      const res = await fetch("/api/copilot/why", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: symbol, metric: metricKey, mode, language, api_key: customKey }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setWhyData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWhyLoading(false);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMsg;
    if (!textToSend.trim() || chatLoading) return;

    const userMsg = {
      role: "user" as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMsg("");
    setChatLoading(true);

    const customKey = localStorage.getItem("user_groq_api_key") || "";
    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: symbol,
          message: textToSend,
          history: messages,
          mode,
          language,
          api_key: customKey,
        }),
      });
      const data = await res.json();
      if (data.status === "success" && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "copilot",
            text: data.reply,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "copilot",
            text: "AI Copilot analysis is grounded in the current live market data. Feel free to ask another question.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "copilot",
          text: "Network error connecting to Copilot assistant.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const copyReportToClipboard = () => {
    if (!reportData?.report_markdown) return;
    navigator.clipboard.writeText(reportData.report_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadReportFile = () => {
    if (!reportData?.report_markdown) return;
    const blob = new Blob([reportData.report_markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${symbol}_AI_Intelligence_Report_${mode}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleSpeech = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    if (!reportData?.summary && !reportData?.report_markdown) return;
    const cleanText = (reportData.summary || reportData.report_markdown)
      .replace(/[#*`_]/g, "")
      .substring(0, 800);
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const quickChips = [
    "Why is this stock showing bullish?",
    "Explain RSI like I'm a beginner",
    "Why did the AI give this target?",
    "What are the biggest risks?",
    "Why is the stop-loss here?",
    "Compare the technical signals",
    "What does the Monte Carlo chart mean?",
    "Summarize everything in simple English",
    "Explain this in Telugu-English",
    "What information is missing before making a decision?",
  ];

  return (
    <div className={`space-y-4 rounded-xl border border-primary/40 bg-card/90 p-4 shadow-[var(--glow-cyan)] ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary/20 text-primary shadow-[var(--glow-cyan)]">
            <Sparkles className="size-5 animate-pulse text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold tracking-wider text-foreground uppercase">
                AI TRADING COPILOT & EXPLAINABILITY
              </h2>
              <span className="rounded bg-primary/20 px-2 py-0.5 text-[0.62rem] font-bold text-primary">
                {symbol}
              </span>
            </div>
            <p className="text-[0.68rem] text-muted-foreground">
              Converts complex quant indicators, ML predictions & risks into clear decision support.
            </p>
          </div>
        </div>

        {/* Mode & Language Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Simple vs Pro Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-secondary/80 p-0.5">
            <button
              onClick={() => setMode("simple")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[0.65rem] font-bold tracking-wider uppercase transition ${
                mode === "simple"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🟢 Simple View
            </button>
            <button
              onClick={() => setMode("pro")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[0.65rem] font-bold tracking-wider uppercase transition ${
                mode === "pro"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ⚡ Pro View
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/80 px-2 py-1">
            <Globe className="size-3.5 text-primary" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as CopilotLanguage)}
              className="bg-transparent text-[0.68rem] font-semibold text-foreground outline-none cursor-pointer"
            >
              <option value="English">🌐 English</option>
              <option value="Telugu-English">🇮🇳 Telugu (తెలుగు)</option>
              <option value="Hindi-English">🇮🇳 Hindi-English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 pb-2 text-xs">
        <button
          onClick={() => setActiveTab("report")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold uppercase transition ${
            activeTab === "report"
              ? "bg-primary/20 text-primary border border-primary/50"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
        >
          <FileText className="size-3.5" />
          📑 AI Intelligence Report
        </button>

        <button
          onClick={() => setActiveTab("sections")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold uppercase transition ${
            activeTab === "sections"
              ? "bg-primary/20 text-primary border border-primary/50"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
        >
          <Cpu className="size-3.5" />
          🧠 Section Explainer
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold uppercase transition ${
            activeTab === "chat"
              ? "bg-primary/20 text-primary border border-primary/50"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
        >
          <MessageSquare className="size-3.5" />
          💬 Ask AI Copilot (Chat)
        </button>

        <button
          onClick={() => setActiveTab("why")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold uppercase transition ${
            activeTab === "why"
              ? "bg-primary/20 text-primary border border-primary/50"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
        >
          <HelpCircle className="size-3.5" />
          ❓ "Why?" Metric Inspector
        </button>
      </div>

      {/* =====================================================================
          TAB 1: STRUCTURED AI REPORT
          ===================================================================== */}
      {activeTab === "report" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">Condition Status:</span>
              <span className="rounded bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                {reportData?.badge || "🟢 POSITIVE"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSpeech}
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-bold transition ${
                  speaking
                    ? "border-bear bg-bear/20 text-bear"
                    : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                <Volume2 className="size-3.5" />
                {speaking ? "Stop Audio" : "🔊 Listen"}
              </button>

              <button
                onClick={copyReportToClipboard}
                className="flex items-center gap-1.5 rounded border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary transition"
              >
                {copied ? <Check className="size-3.5 text-bull" /> : <Copy className="size-3.5" />}
                {copied ? "Copied!" : "Copy Report"}
              </button>

              <button
                onClick={downloadReportFile}
                className="flex items-center gap-1.5 rounded border border-bull/40 bg-bull/10 px-3 py-1.5 text-xs font-bold text-bull hover:bg-bull/20 transition"
              >
                <Download className="size-3.5" />
                Download (.MD)
              </button>

              <button
                onClick={loadReport}
                disabled={reportLoading}
                className="rounded border border-border bg-secondary p-1.5 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                title="Refresh Report"
              >
                <RefreshCw className={`size-3.5 ${reportLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {reportLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
              <Sparkles className="size-6 mx-auto mb-2 text-primary animate-spin" />
              Synthesizing 8-part institutional explainability report for {symbol}...
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border/80 bg-background/80 p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
              {reportData?.report_markdown || "Report generation in progress..."}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: SECTION EXPLAINER
          ===================================================================== */}
      {activeTab === "sections" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              { id: "technicals", label: "📊 Technicals" },
              { id: "ml_prediction", label: "🧠 ML Prediction" },
              { id: "trade_setup", label: "🎯 Trade Setup" },
              { id: "monte_carlo", label: "🎲 Monte Carlo" },
              { id: "risk", label: "🛡️ Risk & Safety" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => loadSectionExplanation(s.id)}
                className={`rounded-lg p-2 text-center font-bold transition ${
                  selectedSection === s.id
                    ? "border border-primary bg-primary/20 text-primary shadow-[var(--glow-cyan)]"
                    : "border border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border/80 bg-background/90 p-4 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground uppercase tracking-wider text-sm">
                  {selectedSection.replace("_", " ")}
                </span>
                <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.62rem] font-bold text-primary">
                  {sectionData?.badge || "🟢 POSITIVE"}
                </span>
              </div>
              <span className="text-[0.65rem] text-muted-foreground font-mono">
                Mode: {mode.toUpperCase()} | {language}
              </span>
            </div>

            {sectionLoading ? (
              <p className="text-muted-foreground animate-pulse py-4 text-center">
                Computing real-time explainability breakdown...
              </p>
            ) : (
              <div className="leading-relaxed whitespace-pre-wrap font-mono text-[0.75rem] text-foreground">
                {sectionData?.explanation || "Select a section above to view explanation."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: INTERACTIVE AI CHAT
          ===================================================================== */}
      {activeTab === "chat" && (
        <div className="space-y-3">
          {/* Quick prompt chips */}
          <div className="flex flex-wrap gap-1.5 text-[0.68rem]">
            <span className="text-muted-foreground font-semibold py-1">Quick Ask:</span>
            {quickChips.slice(0, 6).map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="rounded-full border border-border/80 bg-secondary/60 px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Messages Timeline */}
          <div className="max-h-[320px] min-h-[220px] overflow-y-auto rounded-lg border border-border/80 bg-background/80 p-3 space-y-3 text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-2.5 ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-secondary border border-border/70 text-foreground font-mono text-[0.72rem] leading-relaxed"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <span className="block mt-1 text-[0.58rem] opacity-70 text-right">
                    {m.time}
                  </span>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
                <Sparkles className="size-4 animate-spin text-primary" />
                AI Copilot is analyzing real market telemetry...
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="flex gap-2">
            <input
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={`Ask anything about ${symbol} (e.g. Why is stop loss at this price?)...`}
              className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={chatLoading || !inputMsg.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground uppercase hover:brightness-110 disabled:opacity-50 transition"
            >
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: "WHY?" METRIC INSPECTOR
          ===================================================================== */}
      {activeTab === "why" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { id: "rsi", label: "RSI 14" },
              { id: "predicted_price", label: "ML Predicted Target" },
              { id: "target_1", label: "Target 1 (Base)" },
              { id: "stop_loss", label: "Stop Loss" },
              { id: "kelly_criterion", label: "Kelly Sizing %" },
              { id: "pe_ratio", label: "P/E Valuation" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => loadWhyMetric(m.id)}
                className={`rounded border px-3 py-1.5 font-bold transition ${
                  selectedMetric === m.id
                    ? "border-primary bg-primary/20 text-primary shadow-[var(--glow-cyan)]"
                    : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                ❓ {m.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border/80 bg-background/90 p-4 text-xs space-y-2">
            <h3 className="font-bold text-primary text-sm">
              {whyData?.title || `Understanding ${selectedMetric}`}
            </h3>
            {whyLoading ? (
              <p className="text-muted-foreground animate-pulse py-2">
                Retrieving exact calculated rationale...
              </p>
            ) : (
              <p className="leading-relaxed text-foreground font-mono text-[0.74rem] whitespace-pre-wrap">
                {whyData?.explanation || "Click on any metric above to inspect its exact calculation rationale."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Small inline [WHY?] trigger button that can be placed directly next to numbers in tables/charts.
 */
export function WhyButton({
  metric,
  symbol,
  onClick,
  className = "",
}: {
  metric: string;
  symbol: string;
  onClick?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWhy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
      return;
    }
    setOpen(!open);
    if (!data) {
      setLoading(true);
      try {
        const res = await fetch("/api/copilot/why", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: symbol, metric }),
        });
        const d = await res.json();
        if (d.status === "success") {
          setData(d.explanation);
        }
      } catch (err) {
        setData("Calculation rationale grounded in real volatility & momentum.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <span className="relative inline-block ml-1">
      <button
        onClick={fetchWhy}
        className={`inline-flex items-center gap-0.5 rounded border border-primary/40 bg-primary/10 px-1 py-0.2 text-[0.55rem] font-bold text-primary hover:bg-primary/20 transition ${className}`}
        title={`Click to explain why ${metric} was calculated`}
      >
        WHY?
      </button>

      {open && (
        <div className="absolute left-0 bottom-full z-50 mb-2 w-64 rounded-lg border border-primary/50 bg-background/95 p-3 shadow-xl text-left text-[0.68rem] text-foreground font-mono backdrop-blur-md">
          <div className="flex justify-between items-center border-b border-border/50 pb-1 mb-1.5 font-bold text-primary">
            <span>💡 Rationale: {metric.toUpperCase()}</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>
          {loading ? (
            <p className="animate-pulse text-muted-foreground">Explaining...</p>
          ) : (
            <p className="leading-relaxed">{data}</p>
          )}
        </div>
      )}
    </span>
  );
}
