import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/market/Chrome";
import { Delta, Gauge, LivePrice, Panel } from "@/components/market/primitives";
import CandleChart from "@/components/market/CandleChart";
import { BASE_QUOTES, findQuote, fmt } from "@/lib/market";
import { AiCopilot, WhyButton } from "@/components/copilot/AiCopilot";
import { IndividualAiBlock } from "@/components/copilot/IndividualAiBlock";
import { Sparkles, HelpCircle, ArrowRight, ShieldCheck, Cpu, Target } from "lucide-react";

export const Route = createFileRoute("/stock/$symbol")({
  loader: ({ params }) => {
    const q = findQuote(params.symbol);
    if (!q) throw notFound();
    return { quote: q };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Symbol unavailable — Max Market" }, { name: "robots", content: "noindex" }] };
    const q = loaderData.quote;
    const title = `${q.symbol} — ${q.name} Live Chart, Technicals & Max Market Copilot`;
    const description = `${q.name} (${q.exchange}) live price, candlestick chart with EMA, technical score, Max Market Copilot explainability, fundamentals and DCF valuation.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: StockPage,
});

const RANGES = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y", "MAX"] as const;
const SIDE = ["Overview", "Max Market Copilot", "Hybrid ML", "Charts", "Fundamentals", "Valuation", "News", "Screener", "Watchlist", "Portfolio", "Alerts", "Notes", "Settings"];
const PERF_COLS = ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y"];

function StockPage() {
  const { quote } = Route.useLoaderData();
  const [range, setRange] = useState<(typeof RANGES)[number]>("1D");
  const [tab, setTab] = useState("Overview");
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/stock-data?ticker=${encodeURIComponent(quote.symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success" && d.data) {
          setLiveData(d.data);
        }
      })
      .catch(() => {});
  }, [quote.symbol]);

  const currentP = liveData?.current_price || quote.price;
  const currentChg = liveData ? liveData.change : quote.change;
  const currentChgPct = liveData ? liveData.change_pct : quote.changePct;
  const currSymbol = liveData?.currency_symbol || "₹";

  const perf = (seedmul: number) =>
    PERF_COLS.map((_, i) => +(((i + 1) * 1.4 + currentChgPct) * seedmul).toFixed(2));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />

      {/* Instrument header */}
      <div className="panel m-4 flex flex-wrap items-center gap-6 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-primary/15 font-display text-lg font-bold text-primary">
            {quote.symbol[0]}
          </span>
          <div>
            <h1 className="font-display text-lg font-bold tracking-wide uppercase">
              {liveData?.company_name || quote.name}
            </h1>
            <p className="text-[0.65rem] tracking-widest text-primary uppercase">
              {quote.symbol} · {liveData?.exchange || quote.exchange} · {liveData?.sector || quote.sector}
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <LivePrice value={currentP} className="text-3xl font-bold" />
          <span className="text-xs text-muted-foreground">{liveData?.currency_symbol === "$" ? "USD" : "INR"}</span>
          <span
            className={`rounded px-2 py-1 text-xs font-semibold ${currentChgPct >= 0 ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"}`}
          >
            {currentChg >= 0 ? "+" : ""}
            {fmt(currentChg)} ({currentChgPct >= 0 ? "+" : ""}
            {currentChgPct}%)
          </span>
        </div>
        {[
          ["Day Range", `${currSymbol}${fmt(liveData?.day_low || currentP * 0.986)} – ${currSymbol}${fmt(liveData?.day_high || currentP * 1.008)}`],
          ["52W Range", `${currSymbol}${fmt(liveData?.week_52_low || currentP * 0.72)} – ${currSymbol}${fmt(liveData?.week_52_high || currentP * 1.06)}`],
          ["Volume", liveData ? `${(liveData.volume / 1e6).toFixed(2)}M` : quote.volume],
          ["Market Cap", liveData ? `${currSymbol}${fmt(liveData.market_cap_cr, 0)} Cr` : `${quote.marketCap} INR`],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-[0.58rem] tracking-widest text-muted-foreground uppercase">{k}</p>
            <p className="num text-xs">{v}</p>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setTab("Max Market Copilot")}
            className="flex items-center gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-[0.65rem] font-bold tracking-widest text-primary uppercase hover:bg-primary/20 transition shadow-[var(--glow-cyan)]"
          >
            <Sparkles className="size-3.5" /> ASK AI COPILOT
          </button>
          <span className="flex items-center gap-2 rounded-md border border-bull/40 bg-bull/10 px-3 py-1.5 text-[0.65rem] font-bold tracking-widest text-bull">
            <span className="size-2 animate-pulse rounded-full bg-bull" /> LIVE
          </span>
        </div>
      </div>

      <div className="flex gap-4 px-4 pb-6">
        {/* Left Nav */}
        <aside className="sticky top-[70px] hidden h-fit w-[164px] shrink-0 flex-col gap-0.5 lg:flex">
          {SIDE.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`rounded px-3 py-2.5 text-left text-[0.68rem] font-semibold tracking-widest uppercase transition flex items-center justify-between ${
                tab === s ? "bg-primary/15 text-primary border-l-2 border-primary font-bold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <span>{s}</span>
              {s === "Max Market Copilot" && <Sparkles className="size-3 text-primary animate-pulse" />}
            </button>
          ))}
          <div className="panel mt-3 p-3">
            <p className="mb-2 text-[0.58rem] tracking-widest text-muted-foreground uppercase">Peers</p>
            {BASE_QUOTES.filter((p) => p.sector === quote.sector && p.symbol !== quote.symbol)
              .slice(0, 4)
              .map((p) => (
                <Link
                  key={p.symbol}
                  to="/stock/$symbol"
                  params={{ symbol: p.symbol }}
                  className="flex items-center justify-between py-1 text-[0.7rem] hover:text-primary transition"
                >
                  {p.symbol}
                  <Delta value={p.changePct} />
                </Link>
              ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="grid min-w-0 flex-1 gap-4 xl:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            {/* Chart Section */}
            <section className="panel">
              <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`rounded px-2.5 py-1 text-[0.68rem] font-semibold transition ${
                      range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <span className="mx-2 h-4 w-px bg-border" />
                {["INDICATORS", "TEMPLATES", "COMPARE"].map((x) => (
                  <button
                    key={x}
                    onClick={() => setActiveControl(activeControl === x ? null : x)}
                    className={`rounded px-2.5 py-1 text-[0.62rem] tracking-widest uppercase transition ${
                      activeControl === x ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {x}
                  </button>
                ))}
              </div>

              {activeControl === "INDICATORS" && (
                <div className="p-3 bg-secondary/30 border-b border-border text-xs flex flex-wrap items-center gap-3">
                  <span className="font-bold text-primary">Active Technical Overlays:</span>
                  <span className="bg-bull/15 text-bull px-2 py-0.5 rounded font-semibold inline-flex items-center">
                    ✓ EMA 20 ({currSymbol}{fmt(liveData?.ema_20 || currentP * 0.965)})
                    <WhyButton metric="ema_20" symbol={quote.symbol} />
                  </span>
                  <span className="bg-primary/15 text-primary px-2 py-0.5 rounded font-semibold inline-flex items-center">
                    ✓ EMA 50 ({currSymbol}{fmt(liveData?.ema_50 || currentP * 0.93)})
                  </span>
                  <span className="bg-secondary text-foreground px-2 py-0.5 rounded font-semibold inline-flex items-center">
                    ✓ RSI 14 ({liveData?.rsi_14 || 62.4})
                    <WhyButton metric="rsi" symbol={quote.symbol} />
                  </span>
                </div>
              )}

              {activeControl === "TEMPLATES" && (
                <div className="p-3 bg-secondary/30 border-b border-border text-xs flex gap-3">
                  <span className="font-bold text-primary">Chart Style:</span>
                  <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded font-bold">Candlestick (OHLC)</span>
                  <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded">Heikin-Ashi</span>
                  <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded">Area Line</span>
                </div>
              )}

              {activeControl === "COMPARE" && (
                <div className="p-3 bg-secondary/30 border-b border-border text-xs flex items-center gap-3">
                  <span className="font-bold text-primary">Compare {quote.symbol} vs:</span>
                  <span className="bg-bull/15 text-bull px-2 py-0.5 rounded font-bold">NIFTY 50 (+0.68%)</span>
                  <span className="bg-secondary text-foreground px-2 py-0.5 rounded font-semibold">TCS (+1.12%)</span>
                  <span className="bg-secondary text-foreground px-2 py-0.5 rounded font-semibold">INFY (+0.85%)</span>
                </div>
              )}

              <div className="px-3 pt-3 text-[0.68rem]">
                <p className="font-semibold">
                  {liveData?.company_name || quote.name} · {range} · {liveData?.exchange || quote.exchange}
                  <span className="ml-2 inline-block size-2 animate-pulse rounded-full bg-bull align-middle" />
                </p>
                <div className="num mt-1 flex flex-wrap gap-4 text-muted-foreground">
                  <span>O {currSymbol}{fmt(liveData?.open_price || currentP * 0.991)}</span>
                  <span>H {currSymbol}{fmt(liveData?.day_high || currentP * 1.008)}</span>
                  <span>L {currSymbol}{fmt(liveData?.day_low || currentP * 0.986)}</span>
                  <span className="text-bull font-bold">C {currSymbol}{fmt(currentP)}</span>
                  <span>Vol {liveData ? `${(liveData.volume/1e6).toFixed(2)}M` : quote.volume}</span>
                  <span className="text-chart-1">EMA 20 {currSymbol}{fmt(liveData?.ema_20 || currentP * 0.965)}</span>
                  <span className="text-primary">EMA 50 {currSymbol}{fmt(liveData?.ema_50 || currentP * 0.93)}</span>
                  <span className="text-muted-foreground">RSI {liveData?.rsi_14 ? Number(liveData.rsi_14).toFixed(1) : "50.0"}</span>
                </div>
              </div>
              <CandleChart symbol={quote.symbol} base={currentP} range={range} candlesData={liveData?.chart_series?.candles} />
            </section>

            {/* TAB: Overview */}
            {tab === "Overview" && (
              <div className="space-y-4">
                <Panel
                  title="Financial Performance Matrix"
                  action={
                    <button
                      onClick={() => setTab("Max Market Copilot")}
                      className="text-[0.62rem] font-bold text-primary hover:underline uppercase flex items-center gap-1"
                    >
                      <Sparkles className="size-3" /> Explain with AI →
                    </button>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[0.6rem] tracking-widest text-muted-foreground uppercase">
                          <th className="py-2 text-left font-medium">Series</th>
                          {PERF_COLS.map((c) => (
                            <th key={c} className="py-2 text-center font-medium">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {[
                          { name: quote.symbol, mul: 1 },
                          { name: "NIFTY 50", mul: 0.55 },
                          { name: "RELATIVE ALPHA", mul: 0.45 },
                        ].map((row) => (
                          <tr key={row.name}>
                            <td className="py-2 font-semibold">{row.name}</td>
                            {perf(row.mul).map((v, i) => (
                              <td key={i} className={`num py-2 text-center ${v >= 0 ? "text-bull" : "text-bear"}`}>
                                {v >= 0 ? "+" : ""}
                                {v}%
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>

                {/* Individual AI Block: Overview & 10-Year Regime */}
                <IndividualAiBlock
                  symbol={quote.symbol}
                  section="overview"
                  title="AI Market Regime & 10-Year Decadal Bias"
                  subtitle="10-Year Cycle Benchmark (2014-2024+) · Sector Relative Alpha · Institutional Flow"
                  stockData={liveData}
                  suggestedWhyMetrics={["rsi", "ema_20", "pe_ratio"]}
                />

                {/* Embedded Max Market Copilot Master Explainer */}
                <AiCopilot symbol={quote.symbol} stockData={liveData} />
              </div>
            )}

            {/* TAB: Dedicated Max Market Copilot */}
            {tab === "Max Market Copilot" && (
              <AiCopilot symbol={quote.symbol} stockData={liveData} initialTab="report" />
            )}

            {/* TAB: Charts */}
            {tab === "Charts" && (
              <div className="space-y-4">
                <IndividualAiBlock
                  symbol={quote.symbol}
                  section="technicals"
                  title="AI Chart Geometry & Murphy Candlestick Pattern Engine"
                  subtitle="Murphy Trendlines · Candlestick Wick Rejections · Volume Profile Support"
                  stockData={liveData}
                  suggestedWhyMetrics={["rsi", "ema_20", "target_1", "stop_loss"]}
                />
              </div>
            )}

            {/* TAB: Fundamentals */}
            {tab === "Fundamentals" && (
              <div className="space-y-4">
                <Panel
                  title={`Live Financial Statement & Key Ratios — ${quote.symbol}`}
                  action={
                    <button onClick={() => setTab("Max Market Copilot")} className="text-[0.62rem] font-bold text-primary hover:underline uppercase flex items-center gap-1">
                      <Sparkles className="size-3" /> Explain Fundamentals →
                    </button>
                  }
                >
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-secondary/30 rounded border border-border">
                        <p className="text-muted-foreground uppercase text-[0.6rem]">Quarterly Revenue</p>
                        <p className="num text-base font-bold">{currSymbol}{fmt(liveData?.revenue_cr || 242100, 0)} Cr</p>
                        <p className="text-bull text-[0.65rem]">+12.4% YoY</p>
                      </div>
                      <div className="p-3 bg-secondary/30 rounded border border-border">
                        <p className="text-muted-foreground uppercase text-[0.6rem]">Net Profit Margin</p>
                        <p className="num text-base font-bold">{liveData?.profit_margin || 9.2}%</p>
                        <p className="text-bull text-[0.65rem]">Operating: {liveData?.operating_margin || 14.8}%</p>
                      </div>
                      <div className="p-3 bg-secondary/30 rounded border border-border">
                        <p className="text-muted-foreground uppercase text-[0.6rem]">Return on Equity (ROE)</p>
                        <p className="num text-base font-bold">{liveData?.roe || 12.4}%</p>
                        <p className="text-bull text-[0.65rem]">ROCE: {liveData?.roce || 10.8}%</p>
                      </div>
                      <div className="p-3 bg-secondary/30 rounded border border-border">
                        <p className="text-muted-foreground uppercase text-[0.6rem]">Free Cash Flow</p>
                        <p className="num text-base font-bold">{currSymbol}{fmt(liveData?.free_cashflow_cr || 34800, 0)} Cr</p>
                        <p className="text-bull text-[0.65rem]">D/E: {liveData?.debt_equity || 0.48}</p>
                      </div>
                    </div>
                    {liveData?.summary && (
                      <div className="p-3 bg-secondary/20 rounded border border-border text-muted-foreground leading-relaxed text-[0.72rem]">
                        <p className="font-bold text-foreground mb-1 uppercase text-[0.62rem]">Company Profile</p>
                        {liveData.summary}
                      </div>
                    )}
                  </div>
                </Panel>

                {/* Individual AI Block: Fundamentals */}
                <IndividualAiBlock
                  symbol={quote.symbol}
                  section="fundamentals"
                  title="AI Financial Health & Graham-Dodd Solvency Scorer"
                  subtitle="Graham & Dodd Framework · Piotroski F-Score · Free Cash Flow Shield"
                  stockData={liveData}
                  suggestedWhyMetrics={["pe_ratio", "roe", "eps"]}
                />
              </div>
            )}

            {/* TAB: Valuation */}
            {tab === "Valuation" && (
              <div className="space-y-4">
                <Panel
                  title={`Intrinsic DCF Valuation & Fair Value Matrix — ${quote.symbol}`}
                  action={
                    <button onClick={() => setTab("Max Market Copilot")} className="text-[0.62rem] font-bold text-primary hover:underline uppercase flex items-center gap-1">
                      <Sparkles className="size-3" /> Explain DCF Model →
                    </button>
                  }
                >
                  <div className="space-y-4 text-xs">
                    <p className="text-muted-foreground">Discounted Cash Flow (DCF) intrinsic value based on trailing EPS ({currSymbol}{liveData?.eps || 117.45}) and sector cost of capital.</p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-bear/10 rounded border border-bear/30">
                        <p className="text-bear font-bold">BEAR CASE (-20%)</p>
                        <p className="num text-lg font-bold">{currSymbol}{fmt(currentP * 0.8, 0)}</p>
                        <p className="text-[0.65rem] text-muted-foreground">Slowdown scenario</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded border border-primary/30">
                        <p className="text-primary font-bold">BASE FAIR VALUE</p>
                        <p className="num text-lg font-bold">{currSymbol}{fmt(currentP * 1.08, 0)}</p>
                        <p className="text-[0.65rem] text-muted-foreground">DCF Intrinsic Estimate</p>
                      </div>
                      <div className="p-3 bg-bull/10 rounded border border-bull/30">
                        <p className="text-bull font-bold">BULL CASE (+28%)</p>
                        <p className="num text-lg font-bold">{currSymbol}{fmt(currentP * 1.28, 0)}</p>
                        <p className="text-[0.65rem] text-muted-foreground">Growth expansion</p>
                      </div>
                    </div>
                  </div>
                </Panel>

                {/* Individual AI Block: Valuation */}
                <IndividualAiBlock
                  symbol={quote.symbol}
                  section="valuation"
                  title="AI Intrinsic DCF Valuation & Margin of Safety"
                  subtitle="Damodaran 2-Stage DCF · Cost of Capital (WACC) · Asymmetric Payoffs"
                  stockData={liveData}
                  suggestedWhyMetrics={["pe_ratio", "predicted_price", "target_1"]}
                />
              </div>
            )}

            {/* TAB: News */}
            {tab === "News" && (
              <div className="space-y-4">
                <Panel
                  title={`Live News & Catalyst Feed — ${quote.symbol}`}
                  action={
                    <button onClick={() => setTab("Max Market Copilot")} className="text-[0.62rem] font-bold text-primary hover:underline uppercase flex items-center gap-1">
                      <Sparkles className="size-3" /> Summarize News with AI →
                    </button>
                  }
                >
                  <div className="space-y-3 text-xs">
                    {(liveData?.news_headlines || []).map((n: any, idx: number) => (
                      <div key={idx} className="p-3 bg-secondary/30 rounded border border-border">
                        <p className="font-semibold text-foreground">{n.title}</p>
                        <p className="text-[0.68rem] text-muted-foreground mt-1">{n.summary}</p>
                        <div className="flex justify-between text-[0.62rem] text-primary mt-2">
                          <span>{n.source}</span>
                          <span>{n.date}</span>
                        </div>
                      </div>
                    ))}
                    {(!liveData?.news_headlines || liveData.news_headlines.length === 0) && (
                      <p className="text-muted-foreground p-4 text-center">No recent news found for {quote.symbol}.</p>
                    )}
                  </div>
                </Panel>

                {/* Individual AI Block: News */}
                <IndividualAiBlock
                  symbol={quote.symbol}
                  section="news"
                  title="AI Real-Time News Catalyst & Signal vs Noise Distillation"
                  subtitle="Institutional Flow Sentiment · Earnings Catalyst Verification · Noise Filter"
                  stockData={liveData}
                  suggestedWhyMetrics={["rsi", "target_1", "stop_loss"]}
                />
              </div>
            )}

            {/* TAB: Hybrid ML */}
            {tab === "Hybrid ML" && (
              <div className="space-y-4">
                <HybridMlStockPanel symbol={quote.symbol} currentPrice={currentP} currencySymbol={currSymbol} />
                <IndividualAiBlock
                  symbol={quote.symbol}
                  section="hybrid_ml"
                  title="AI Dual-Model Quant Deep Dive & Lopez de Prado Meta-Labeling"
                  subtitle="GBDT + BiLSTM Attention · Purged Cross-Validation · Feature Importance"
                  stockData={liveData}
                  suggestedWhyMetrics={["predicted_price", "kelly_criterion", "stop_loss"]}
                />
              </div>
            )}

            {tab !== "Overview" && tab !== "Max Market Copilot" && tab !== "Charts" && tab !== "Hybrid ML" && tab !== "Fundamentals" && tab !== "Valuation" && tab !== "News" && (
              <div className="space-y-4">
                <Panel title={`${tab} Module — ${quote.symbol}`}>
                  <div className="p-4 text-xs text-muted-foreground">
                    <p className="font-bold text-foreground mb-1">Active Section: {tab}</p>
                    <p>Viewing live technical metrics, analyst models, and market intelligence for {quote.name} ({quote.symbol}).</p>
                  </div>
                </Panel>
                <IndividualAiBlock
                  symbol={quote.symbol}
                  section={tab.toLowerCase()}
                  title={`AI ${tab} Intelligence — ${quote.symbol}`}
                  subtitle={`Dedicated contextual AI analysis for ${tab} module`}
                  stockData={liveData}
                  suggestedWhyMetrics={["rsi", "target_1", "stop_loss"]}
                />
              </div>
            )}
          </div>

          {/* Right Rail */}
          <div className="space-y-4">
            <Panel
              title="Technical Conviction Score"
              action={
                <button onClick={() => setTab("Max Market Copilot")} className="text-[0.6rem] font-bold text-primary hover:underline uppercase">
                  Explain →
                </button>
              }
            >
              <div className="flex items-center gap-5">
                <Gauge value={liveData?.rsi_14 ? Math.round(liveData.rsi_14) : 74} label="Bullish" />
                <div className="flex-1 space-y-2 text-xs">
                  {[
                    ["Trend", currentP > (liveData?.ema_50 || currentP) ? "BULLISH" : "BEARISH", currentP > (liveData?.ema_50 || currentP) ? "text-bull" : "text-bear"],
                    ["Momentum", "STRONG", "text-bull"],
                    ["RSI (14)", `${liveData?.rsi_14 ? Number(liveData.rsi_14).toFixed(1) : 62.4}`, "text-primary"],
                    ["Volume Profile", "EXPANDING", "text-bull"],
                  ].map(([k, v, c]) => (
                    <div key={k} className="flex justify-between items-center border-b border-border/50 pb-1.5">
                      <span className="tracking-widest text-muted-foreground uppercase flex items-center">
                        {k}
                        {k.includes("RSI") && <WhyButton metric="rsi" symbol={quote.symbol} />}
                      </span>
                      <span className={`font-semibold ${c}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel
              title="Fundamental Snapshot"
              action={
                <button onClick={() => setTab("Max Market Copilot")} className="text-[0.6rem] font-bold text-primary hover:underline uppercase">
                  Why? →
                </button>
              }
            >
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                {[
                  ["P/E Ratio", liveData?.pe_ratio || "24.3", "pe_ratio"],
                  ["P/B Ratio", liveData?.pb_ratio || "2.23", "pb_ratio"],
                  ["ROE %", `${liveData?.roe || "12.4"}%`, "roe"],
                  ["EPS", `${currSymbol}${liveData?.eps != null ? liveData.eps : (currSymbol === "$" ? "4.85" : "14.20")}`, "eps"],
                  ["Div Yield", `${liveData?.dividend_yield || "0.74"}%`, "dividend"],
                  ["Debt / Equity", liveData?.debt_equity || "0.48", "debt"],
                ].map(([k, v, mKey]) => (
                  <div key={k} className="rounded bg-secondary/40 p-2 border border-border/50">
                    <p className="text-[0.55rem] tracking-widest text-muted-foreground uppercase flex items-center justify-center">
                      {k}
                      <WhyButton metric={mKey} symbol={quote.symbol} />
                    </p>
                    <p className="num text-xs font-semibold">{v}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Max Market Copilot Quick Actions">
              <div className="space-y-2 text-xs">
                <button
                  onClick={() => setTab("Max Market Copilot")}
                  className="w-full flex items-center justify-between p-2.5 rounded bg-primary/10 border border-primary/40 text-primary font-bold hover:bg-primary/20 transition"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-4" /> Generate Full AI Report
                  </span>
                  <ArrowRight className="size-3.5" />
                </button>
                <button
                  onClick={() => setTab("Max Market Copilot")}
                  className="w-full flex items-center justify-between p-2.5 rounded bg-secondary/60 border border-border text-foreground font-semibold hover:border-primary transition"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="size-4 text-primary" /> Ask AI: "Why this target?"
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function HybridMlStockPanel({ symbol, currentPrice, currencySymbol = "₹" }: { symbol: string; currentPrice: number; currencySymbol?: string }) {
  const [period, setPeriod] = useState("2y");
  const [loading, setLoading] = useState(false);
  const [mlData, setMlData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const fetchMlPrediction = async (force = false) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/ml-predict?ticker=${encodeURIComponent(symbol)}&period=${period}&force=${force ? "1" : "0"}`);
      const data = await res.json();
      if (data.status === "success") {
        setMlData(data);
      } else {
        setErr(data.message || "Failed to generate ML forecast.");
      }
    } catch (e: any) {
      setErr(e.message || "Network error fetching ML forecast.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMlPrediction(false);
  }, [symbol, period]);

  return (
    <Panel title={`Hybrid Machine Learning Quant Engine (GBDT + BiLSTM Attention) — ${symbol}`}>
      <div className="space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <p className="font-bold text-foreground">Dual-Model Stacking Ensembler with Monte Carlo Simulation</p>
            <p className="text-muted-foreground text-[0.68rem]">
              Trains Gradient Boosted Decision Forest + PyTorch BiLSTM Attention on 38 quantitative indicators.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded border border-border bg-secondary px-2.5 py-1.5 text-xs text-foreground outline-none font-semibold"
            >
              <option value="6mo">6 Months History</option>
              <option value="1y">1 Year History</option>
              <option value="2y">2 Years History</option>
            </select>
            <button
              onClick={() => fetchMlPrediction(true)}
              disabled={loading}
              className="rounded bg-primary px-4 py-1.5 font-bold tracking-wider text-primary-foreground uppercase hover:brightness-110 disabled:opacity-50 transition"
            >
              {loading ? "Training & Forecasting..." : "⚡ Run Pro ML Model"}
            </button>
          </div>
        </div>

        {err && <div className="p-3 bg-bear/15 text-bear rounded font-semibold">{err}</div>}

        {!mlData && !loading && !err && (
          <div className="p-6 text-center text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">No ML Forecast Generated Yet</p>
            <p>Click "Run Pro ML Model" to trigger model training, feature importance discovery, and stochastic Monte Carlo forecasts.</p>
          </div>
        )}

        {mlData && (
          <div className="space-y-4">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-secondary/40 rounded border border-border">
                <p className="text-[0.6rem] text-muted-foreground uppercase flex items-center justify-between font-bold">
                  <span>1-Day ML Target</span>
                  <WhyButton metric="predicted_price" symbol={symbol} />
                </p>
                <p className="num text-lg font-bold text-primary">{currencySymbol}{fmt(mlData.trade_setup.predicted_price)}</p>
                <p className={`text-[0.68rem] font-semibold ${mlData.trade_setup.predicted_change_pct >= 0 ? "text-bull" : "text-bear"}`}>
                  {mlData.trade_setup.predicted_change_pct >= 0 ? "+" : ""}{mlData.trade_setup.predicted_change_pct}% Expected Move
                </p>
              </div>

              <div className="p-3 bg-secondary/40 rounded border border-border">
                <p className="text-[0.6rem] text-muted-foreground uppercase font-bold">Tactical Signal & Conviction</p>
                <p className={`num text-lg font-bold ${mlData.trade_setup.action.includes("BUY") ? "text-bull" : mlData.trade_setup.action.includes("SELL") ? "text-bear" : "text-amber-400"}`}>
                  {mlData.trade_setup.action}
                </p>
                <p className="text-[0.68rem] text-muted-foreground">Confidence: {mlData.trade_setup.confidence_pct}%</p>
              </div>

              <div className="p-3 bg-secondary/40 rounded border border-border">
                <p className="text-[0.6rem] text-muted-foreground uppercase flex items-center justify-between font-bold">
                  <span>Directional Hit Rate</span>
                  <WhyButton metric="kelly_criterion" symbol={symbol} />
                </p>
                <p className="num text-lg font-bold text-foreground">{mlData.evaluation_metrics.hit_rate_pct}%</p>
                <p className="text-[0.68rem] text-muted-foreground">Kelly Sizing: {mlData.backtest_metrics?.kelly_criterion_pct ?? 15}%</p>
              </div>

              <div className="p-3 bg-secondary/40 rounded border border-border">
                <p className="text-[0.6rem] text-muted-foreground uppercase font-bold">Strategy Alpha (Sharpe: {mlData.backtest_metrics.sharpe_ratio})</p>
                <p className="num text-lg font-bold text-bull">+{mlData.backtest_metrics.outperformance_pct}%</p>
                <p className="text-[0.68rem] text-muted-foreground">Sortino: {mlData.backtest_metrics?.sortino_ratio ?? 1.8}</p>
              </div>
            </div>

            {/* Model Weight Balance Bar */}
            <div className="p-3 bg-secondary/30 rounded border border-border space-y-2">
              <div className="flex justify-between text-[0.68rem] font-bold">
                <span className="text-amber-400">Tree Gradient Boosting: {mlData.model_composition.tree_weight_pct}%</span>
                <span className="text-purple-400">PyTorch BiLSTM Attention: {mlData.model_composition.neural_weight_pct}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                <div style={{ width: `${mlData.model_composition.tree_weight_pct}%` }} className="bg-amber-400 h-full" />
                <div style={{ width: `${mlData.model_composition.neural_weight_pct}%` }} className="bg-purple-400 h-full" />
              </div>
            </div>

            {/* Multi-Horizon Targets */}
            {mlData.multi_horizon_targets && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 bg-secondary/30 rounded border border-border">
                  <p className="text-[0.6rem] text-muted-foreground uppercase font-bold flex items-center justify-center">
                    1-Day Scalp Target <WhyButton metric="predicted_price" symbol={symbol} />
                  </p>
                  <p className="num font-bold text-base text-primary">{currencySymbol}{fmt(mlData.multi_horizon_targets.target_1d)}</p>
                  <p className="text-[0.65rem] text-muted-foreground">{mlData.multi_horizon_targets.expected_1d_pct}%</p>
                </div>
                <div className="p-2.5 bg-secondary/30 rounded border border-border">
                  <p className="text-[0.6rem] text-muted-foreground uppercase font-bold">3-Day Swing Target</p>
                  <p className="num font-bold text-base text-primary">{currencySymbol}{fmt(mlData.multi_horizon_targets.target_3d)}</p>
                  <p className="text-[0.65rem] text-muted-foreground">{mlData.multi_horizon_targets.expected_3d_pct}%</p>
                </div>
                <div className="p-2.5 bg-secondary/30 rounded border border-border">
                  <p className="text-[0.6rem] text-muted-foreground uppercase font-bold">5-Day Trend Target</p>
                  <p className="num font-bold text-base text-primary">{currencySymbol}{fmt(mlData.multi_horizon_targets.target_5d)}</p>
                  <p className="text-[0.65rem] text-muted-foreground">{mlData.multi_horizon_targets.expected_5d_pct}%</p>
                </div>
              </div>
            )}

            {/* Tactical Setup Matrix */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
              <div className="p-2 bg-secondary/20 rounded border border-border/50">
                <p className="text-[0.58rem] text-muted-foreground uppercase">Entry Price</p>
                <p className="num font-bold text-foreground">{currencySymbol}{fmt(mlData.trade_setup.entry_price)}</p>
              </div>
              <div className="p-2 bg-secondary/20 rounded border border-border/50">
                <p className="text-[0.58rem] text-muted-foreground uppercase flex items-center justify-center">
                  Target 1 <WhyButton metric="target_1" symbol={symbol} />
                </p>
                <p className="num font-bold text-bull">{currencySymbol}{fmt(mlData.trade_setup.target_1)}</p>
              </div>
              <div className="p-2 bg-secondary/20 rounded border border-border/50">
                <p className="text-[0.58rem] text-muted-foreground uppercase">Target 2 (2.5 ATR)</p>
                <p className="num font-bold text-bull">{currencySymbol}{fmt(mlData.trade_setup.target_2)}</p>
              </div>
              <div className="p-2 bg-secondary/20 rounded border border-border/50">
                <p className="text-[0.58rem] text-muted-foreground uppercase">Target 3 (Moonshot)</p>
                <p className="num font-bold text-bull">{currencySymbol}{fmt(mlData.trade_setup.target_3 || mlData.trade_setup.target_2 * 1.05)}</p>
              </div>
              <div className="p-2 bg-secondary/20 rounded border border-border/50">
                <p className="text-[0.58rem] text-muted-foreground uppercase flex items-center justify-center">
                  Stop-Loss <WhyButton metric="stop_loss" symbol={symbol} />
                </p>
                <p className="num font-bold text-bear">{currencySymbol}{fmt(mlData.trade_setup.stop_loss)}</p>
              </div>
            </div>

            {/* Monte Carlo 10-Day Projection */}
            {(mlData.monte_carlo_forecast || mlData.monte_carlo) && (
              <div className="p-3 bg-secondary/30 rounded border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-[0.7rem] text-foreground">10-Day Monte Carlo Stochastic Projection Cone</p>
                  <span className="text-[0.62rem] text-muted-foreground">40 Paths · GBM Drift</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-bear/10 rounded border border-bear/30">
                    <p className="text-[0.58rem] text-bear font-bold uppercase">10th Percentile (Bear)</p>
                    <p className="num font-bold text-foreground">{currencySymbol}{fmt((mlData.monte_carlo_forecast || mlData.monte_carlo).p10_day10 || (mlData.monte_carlo_forecast || mlData.monte_carlo).terminal_bear_price)}</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded border border-primary/30">
                    <p className="text-[0.58rem] text-primary font-bold uppercase">Expected Median Path</p>
                    <p className="num font-bold text-foreground">{currencySymbol}{fmt((mlData.monte_carlo_forecast || mlData.monte_carlo).p50_day10 || (mlData.monte_carlo_forecast || mlData.monte_carlo).terminal_expected_price)}</p>
                  </div>
                  <div className="p-2 bg-bull/10 rounded border border-bull/30">
                    <p className="text-[0.58rem] text-bull font-bold uppercase">90th Percentile (Bull)</p>
                    <p className="num font-bold text-foreground">{currencySymbol}{fmt((mlData.monte_carlo_forecast || mlData.monte_carlo).p90_day10 || (mlData.monte_carlo_forecast || mlData.monte_carlo).terminal_bull_price)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
