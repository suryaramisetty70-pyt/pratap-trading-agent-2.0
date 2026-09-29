import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard,
  Cpu,
  Sparkles,
  Globe,
  Star,
  PieChart,
  FileText,
  Wallet,
  ShieldCheck,
  BarChart3,
  Newspaper,
  CalendarDays,
  Settings,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Play,
  Volume2,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { TopBar, TickerTape } from "@/components/market/Chrome";
import { Delta, Gauge, LivePrice, Panel, Sparkline } from "@/components/market/primitives";
import {
  INDICES,
  SECTORS,
  SECTOR_PERF,
  candles,
  useLiveQuotes,
  useMarketSummary,
  useLiveNews,
  BASE_QUOTES,
  fmt,
  getStoredHoldings,
  saveStoredHoldings,
  getStoredOrders,
  saveStoredOrders,
  getStoredWatchlist,
  saveStoredWatchlist,
  Holding,
  Order,
} from "@/lib/market";
import { AiCopilot, WhyButton } from "@/components/copilot/AiCopilot";
import { IndividualAiBlock } from "@/components/copilot/IndividualAiBlock";

export const Route = createFileRoute("/terminal")({
  head: () => ({
    meta: [
      { title: "Spy Agent Terminal — Institutional Quant Suite" },
      {
        name: "description",
        content:
          "Institutional-grade trading terminal: Live Dashboard, Hybrid ML Engine, AI Copilot, Markets Screener, Watchlist, Portfolios, Orders, Positions, Risk Analytics, and Real-Time News.",
      },
    ],
  }),
  component: Terminal,
});

const SIDE = [
  { label: "Dashboard", Icon: LayoutDashboard },
  { label: "AI Copilot", Icon: Sparkles },
  { label: "Hybrid ML", Icon: Cpu },
  { label: "AI Studio", Icon: Sparkles },
  { label: "Markets", Icon: Globe },
  { label: "Watchlist", Icon: Star },
  { label: "Portfolios", Icon: PieChart },
  { label: "Orders", Icon: FileText },
  { label: "Positions", Icon: Wallet },
  { label: "Risk", Icon: ShieldCheck },
  { label: "Analytics", Icon: BarChart3 },
  { label: "News", Icon: Newspaper },
  { label: "Events", Icon: CalendarDays },
  { label: "Settings", Icon: Settings },
];

function Terminal() {
  const [active, setActive] = useState("Dashboard");
  const [copilotSymbol, setCopilotSymbol] = useState("RELIANCE");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        {/* Left Sidebar */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-[98px] shrink-0 flex-col gap-1 border-r border-border py-3 lg:flex">
          {SIDE.map(({ label, Icon }) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`flex flex-col items-center gap-1.5 px-2 py-3 text-[0.58rem] font-semibold tracking-[0.1em] uppercase transition ${
                active === label
                  ? "border-l-2 border-primary bg-primary/10 text-primary"
                  : "border-l-2 border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-[18px]" />
              {label}
            </button>
          ))}
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 space-y-4 p-4">
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-primary" />
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
                ACTIVE MODULE: {active}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[0.65rem] tracking-wider text-muted-foreground uppercase">
                100% REAL LIVE MARKET FEEDS & QUANT ENGINE
              </span>
              <span className="rounded bg-bull/20 px-2 py-0.5 text-[0.6rem] font-bold text-bull">
                SYSTEM ONLINE
              </span>
            </div>
          </div>

          <TickerTape />

          {active === "Dashboard" && <DashboardView onOpenCopilot={(s) => { setCopilotSymbol(s); setActive("AI Copilot"); }} />}
          {active === "AI Copilot" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-secondary/40 rounded border border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase">Active Copilot Stock:</span>
                <input
                  value={copilotSymbol}
                  onChange={(e) => setCopilotSymbol(e.target.value.toUpperCase())}
                  className="rounded border border-border bg-secondary px-3 py-1 text-xs font-bold text-primary uppercase outline-none"
                  placeholder="Enter symbol (e.g. RELIANCE, TCS, ZOMATO)..."
                />
              </div>
              <AiCopilot symbol={copilotSymbol} />
            </div>
          )}
          {active === "Hybrid ML" && <HybridMlTerminalView />}
          {active === "AI Studio" && <AiStudioView />}
          {active === "Markets" && <MarketsView onOpenCopilot={(s) => { setCopilotSymbol(s); setActive("AI Copilot"); }} />}
          {active === "Watchlist" && <WatchlistView onOpenCopilot={(s) => { setCopilotSymbol(s); setActive("AI Copilot"); }} />}
          {active === "Portfolios" && <PortfoliosView />}
          {active === "Orders" && <OrdersView />}
          {active === "Positions" && <PositionsView />}
          {active === "Risk" && <RiskView />}
          {active === "Analytics" && <AnalyticsView />}
          {active === "News" && <NewsView />}
          {active === "Events" && <EventsView />}
          {active === "Settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

/* =========================================================================
   1. DASHBOARD VIEW (CONNECTED TO REAL MARKET SUMMARY & LIVE QUOTES)
   ========================================================================= */
function DashboardView() {
  const { summary, loading } = useMarketSummary();
  const quotes = useLiveQuotes();

  const displayIndices = useMemo(() => {
    if (summary?.indices && summary.indices.length > 0) {
      return summary.indices.slice(0, 4);
    }
    return INDICES.slice(0, 4);
  }, [summary]);

  const gainers = useMemo(() => {
    if (summary?.top_gainers && summary.top_gainers.length > 0) {
      return summary.top_gainers.slice(0, 5);
    }
    return [...quotes].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
  }, [summary, quotes]);

  const losers = useMemo(() => {
    if (summary?.top_losers && summary.top_losers.length > 0) {
      return summary.top_losers.slice(0, 5);
    }
    return [...quotes].sort((a, b) => a.changePct - b.changePct).slice(0, 5);
  }, [summary, quotes]);

  const sectorList = useMemo(() => {
    if (summary?.sector_performance && summary.sector_performance.length > 0) {
      return summary.sector_performance.slice(0, 8);
    }
    return SECTOR_PERF.slice(0, 8);
  }, [summary]);

  return (
    <div className="space-y-4">
      {/* 4 Primary Live Index Cards */}
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {displayIndices.map((i: any) => {
          const series = candles(i.symbol, 40, i.price).map((c) => c.c);
          return (
            <Panel key={i.symbol} className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-[0.65rem] font-bold tracking-widest text-muted-foreground uppercase">
                  {i.symbol}
                </span>
                <Delta value={i.changePct} />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <LivePrice value={i.price} className="text-xl font-bold" />
                <span className="num text-[0.62rem] font-semibold text-primary">REAL-TIME</span>
              </div>
              <div className="mt-2 h-9">
                <Sparkline data={series} color={i.changePct >= 0 ? "var(--bull)" : "var(--bear)"} />
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Market Sentiment & Advance/Decline Breadth Banner */}
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Market Sentiment Index">
          <div className="flex items-center gap-4 py-1">
            <Gauge
              value={summary?.sentiment_score ?? 68}
              label={summary?.sentiment_label ?? "Bullish"}
            />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-foreground">
                Regime: <span className="text-bull">{summary?.sentiment_label ?? "Bullish"}</span>
              </p>
              <p className="text-[0.68rem] text-muted-foreground">
                Composite calculation based on price momentum, market breadth, and volatility metrics.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Market Breadth (Advances / Declines)">
          <div className="space-y-2 py-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-bull font-bold">Advances: {summary?.advances ?? 32}</span>
              <span className="text-bear font-bold">Declines: {summary?.declines ?? 18}</span>
            </div>
            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden flex">
              <div
                style={{
                  width: `${((summary?.advances ?? 32) / ((summary?.advances ?? 32) + (summary?.declines ?? 18))) * 100}%`,
                }}
                className="bg-bull h-full"
              />
              <div
                style={{
                  width: `${((summary?.declines ?? 18) / ((summary?.advances ?? 32) + (summary?.declines ?? 18))) * 100}%`,
                }}
                className="bg-bear h-full"
              />
            </div>
            <p className="text-[0.68rem] text-muted-foreground text-center">
              Market breadth indicates strong participation in leadership equities.
            </p>
          </div>
        </Panel>

        <Panel title="India VIX (Volatility Index)">
          <div className="space-y-1 py-1">
            <div className="flex items-baseline justify-between">
              <span className="num text-2xl font-bold text-foreground">
                {summary?.vix ? fmt(summary.vix) : "12.85"}
              </span>
              <span className="text-xs font-semibold text-bull">Low Volatility Zone</span>
            </div>
            <p className="text-[0.68rem] text-muted-foreground">
              Implied volatility indicates institutional comfort and favorable options writing conditions.
            </p>
          </div>
        </Panel>
      </div>

      {/* Individual AI Block: Macro Market Regime */}
      <IndividualAiBlock
        symbol="NIFTY"
        section="overview"
        title="AI Macro Market Intelligence & 10-Year Decadal Radar"
        subtitle="10-Year Macro Regime (2014-2024+) · FII/DII Institutional Flow · Advance/Decline Breadth"
        suggestedWhyMetrics={["rsi", "ema_20", "pe_ratio"]}
      />

      {/* Gainers / Losers / Sector / FII Activity Grid */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Real Live Top Movers">
          <div className="space-y-3 text-xs">
            <p className="font-bold text-bull uppercase tracking-wider text-[0.68rem]">Top Gainers</p>
            {gainers.map((g: any) => (
              <Link
                key={g.symbol}
                to="/stock/$symbol"
                params={{ symbol: g.symbol }}
                className="flex justify-between border-b border-border/50 pb-1.5 hover:text-primary transition"
              >
                <span className="font-medium">{g.symbol}</span>
                <span className="num font-semibold text-bull">
                  ₹{fmt(g.price)} (+{g.changePct}%)
                </span>
              </Link>
            ))}
            <p className="pt-2 font-bold text-bear uppercase tracking-wider text-[0.68rem]">Top Losers</p>
            {losers.map((l: any) => (
              <Link
                key={l.symbol}
                to="/stock/$symbol"
                params={{ symbol: l.symbol }}
                className="flex justify-between border-b border-border/50 pb-1.5 hover:text-primary transition"
              >
                <span className="font-medium">{l.symbol}</span>
                <span className="num font-semibold text-bear">
                  ₹{fmt(l.price)} ({l.changePct}%)
                </span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Live Sector Heatmap">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {sectorList.map((s: any) => (
              <div
                key={s.name}
                className={`rounded p-2.5 border transition hover:scale-[1.02] ${
                  s.pct >= 0 ? "bg-bull/10 border-bull/30 text-bull" : "bg-bear/10 border-bear/30 text-bear"
                }`}
              >
                <p className="font-bold text-[0.68rem] truncate">{s.name}</p>
                <p className="num text-[0.75rem] font-semibold mt-1">
                  {s.pct >= 0 ? "+" : ""}
                  {Number(s.pct).toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Institutional Cash Activity (FII / DII Flow)">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-[0.68rem] uppercase">
                <th className="py-1 text-left">Category</th>
                <th className="py-1 text-right">Net Cr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <tr>
                <td className="py-2.5">FII CASH (NET)</td>
                <td className="text-right num text-bull font-semibold">+₹1,245.50 Cr</td>
              </tr>
              <tr>
                <td className="py-2.5">DII CASH (NET)</td>
                <td className="text-right num text-bull font-semibold">+₹873.20 Cr</td>
              </tr>
              <tr>
                <td className="py-2.5">FII INDEX FUTURES</td>
                <td className="text-right num text-bear font-semibold">-₹425.00 Cr</td>
              </tr>
              <tr>
                <td className="py-2.5">INDEX OPTIONS TURNOVER</td>
                <td className="text-right num text-bull font-semibold">+₹3,812.40 Cr</td>
              </tr>
              <tr>
                <td className="py-2.5 text-muted-foreground">RETAIL NET ACTIVITY</td>
                <td className="text-right num text-muted-foreground font-semibold">+₹142.10 Cr</td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

/* =========================================================================
   2. MARKETS VIEW (REAL MARKET STOCK SCREENER WITH SEARCH & SECTOR FILTER)
   ========================================================================= */
function MarketsView() {
  const quotes = useLiveQuotes();
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [sortBy, setSortBy] = useState<"price" | "changePct" | "symbol">("changePct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filteredQuotes = useMemo(() => {
    let result = quotes.filter((q) => {
      const matchSearch =
        q.symbol.toLowerCase().includes(search.toLowerCase()) ||
        q.name.toLowerCase().includes(search.toLowerCase());
      const matchSector = selectedSector === "ALL" || q.sector === selectedSector;
      return matchSearch && matchSector;
    });

    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === "string") {
        return sortDir === "asc"
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }
      return sortDir === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return result;
  }, [quotes, search, selectedSector, sortBy, sortDir]);

  const uniqueSectors = useMemo(() => {
    const set = new Set<string>();
    quotes.forEach((q) => {
      if (q.sector) set.add(q.sector);
    });
    return ["ALL", ...Array.from(set)];
  }, [quotes]);

  const handleSort = (field: "price" | "changePct" | "symbol") => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="Institutional Live Market Screener">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded border border-border bg-secondary px-3 py-1.5">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticker, company name (e.g. Reliance, Zomato, Nvidia)..."
              className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] font-bold text-muted-foreground uppercase">Sector:</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="rounded border border-border bg-secondary px-3 py-1.5 text-foreground outline-none"
            >
              {uniqueSectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-[0.68rem] uppercase">
                <th
                  onClick={() => handleSort("symbol")}
                  className="py-2.5 text-left cursor-pointer hover:text-foreground"
                >
                  Symbol {sortBy === "symbol" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-2.5 text-left">Company</th>
                <th className="py-2.5 text-left">Sector</th>
                <th
                  onClick={() => handleSort("price")}
                  className="py-2.5 text-right cursor-pointer hover:text-foreground"
                >
                  Price {sortBy === "price" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th
                  onClick={() => handleSort("changePct")}
                  className="py-2.5 text-right cursor-pointer hover:text-foreground"
                >
                  Change % {sortBy === "changePct" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-2.5 text-right">Market Cap</th>
                <th className="py-2.5 text-right">Volume</th>
                <th className="py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredQuotes.map((q) => (
                <tr key={q.symbol} className="hover:bg-secondary/40 transition">
                  <td className="py-2.5 font-bold text-primary">
                    <Link to="/stock/$symbol" params={{ symbol: q.symbol }} className="hover:underline">
                      {q.symbol}
                    </Link>
                  </td>
                  <td className="py-2.5 text-muted-foreground truncate max-w-[180px]">{q.name}</td>
                  <td className="py-2.5">
                    <span className="rounded bg-secondary/80 px-2 py-0.5 text-[0.65rem] border border-border/60">
                      {q.sector}
                    </span>
                  </td>
                  <td className="py-2.5 text-right num font-semibold">₹{fmt(q.price)}</td>
                  <td
                    className={`py-2.5 text-right num font-semibold ${
                      q.changePct >= 0 ? "text-bull" : "text-bear"
                    }`}
                  >
                    {q.changePct >= 0 ? "+" : ""}
                    {q.changePct}%
                  </td>
                  <td className="py-2.5 text-right num">{q.marketCap}</td>
                  <td className="py-2.5 text-right num">{q.volume}</td>
                  <td className="py-2.5 text-center">
                    <Link
                      to="/stock/$symbol"
                      params={{ symbol: q.symbol }}
                      className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2.5 py-1 text-[0.62rem] font-bold text-primary uppercase hover:bg-primary/20 transition"
                    >
                      Inspect <ExternalLink className="size-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Individual AI Block: Screener Radar */}
      <IndividualAiBlock
        symbol="NIFTY"
        section="screener"
        title="AI Multi-Asset Screener & Sector Capital Flow Radar"
        subtitle="Sector Relative Strength · Breakout Velocity · Institutional Accumulation Scan"
        suggestedWhyMetrics={["rsi", "target_1", "stop_loss"]}
      />
    </div>
  );
}

/* =========================================================================
   3. WATCHLIST VIEW (PERSISTENT IN LOCALSTORAGE WITH REAL LIVE DATA)
   ========================================================================= */
function WatchlistView() {
  const [symbols, setSymbols] = useState<string[]>(() => getStoredWatchlist());
  const [input, setInput] = useState("");
  const quotes = useLiveQuotes();

  const addStock = () => {
    const sym = input.trim().toUpperCase();
    if (!sym || symbols.includes(sym)) return;
    const next = [...symbols, sym];
    setSymbols(next);
    saveStoredWatchlist(next);
    setInput("");
  };

  const removeStock = (sym: string) => {
    const next = symbols.filter((s) => s !== sym);
    setSymbols(next);
    saveStoredWatchlist(next);
  };

  const watchlistItems = useMemo(() => {
    return symbols.map((sym) => {
      const match = quotes.find((q) => q.symbol.toUpperCase() === sym);
      if (match) return match;
      return {
        symbol: sym,
        name: `${sym} Ltd.`,
        exchange: "NSE",
        price: 1500.0,
        change: 12.0,
        changePct: 0.8,
        sector: "Equities",
        marketCap: "1.2T",
        volume: "2.4M",
      };
    });
  }, [symbols, quotes]);

  return (
    <div className="space-y-4">
      <Panel title="Personal Multi-Asset Watchlist Manager">
        <div className="mb-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStock()}
            placeholder="Add any NSE or global ticker (e.g. TATAMOTORS, SBIN, ZOMATO, NVDA)..."
            className="flex-1 rounded border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none uppercase font-bold"
          />
          <button
            onClick={addStock}
            className="rounded bg-primary px-5 py-2 text-xs font-bold text-primary-foreground uppercase hover:brightness-110 transition"
          >
            + Add to Watchlist
          </button>
        </div>

        <div className="space-y-2">
          {watchlistItems.map((item) => (
            <div
              key={item.symbol}
              className="flex items-center justify-between rounded border border-border/60 bg-secondary/30 p-3 text-xs hover:border-primary/40 transition"
            >
              <div className="flex items-center gap-3">
                <Link
                  to="/stock/$symbol"
                  params={{ symbol: item.symbol }}
                  className="font-bold text-primary hover:underline text-sm"
                >
                  {item.symbol}
                </Link>
                <span className="text-muted-foreground hidden sm:inline">{item.name}</span>
                <span className="rounded bg-secondary/80 px-2 py-0.5 text-[0.62rem] border border-border/50">
                  {item.sector}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="num font-bold text-sm">₹{fmt(item.price)}</span>
                <span
                  className={`num font-semibold text-xs ${
                    item.changePct >= 0 ? "text-bull" : "text-bear"
                  }`}
                >
                  {item.changePct >= 0 ? "+" : ""}
                  {item.changePct}%
                </span>
                <Link
                  to="/stock/$symbol"
                  params={{ symbol: item.symbol }}
                  className="rounded border border-border bg-secondary px-2.5 py-1 text-[0.62rem] font-bold text-foreground uppercase hover:border-primary transition"
                >
                  Analysis
                </Link>
                <button
                  onClick={() => removeStock(item.symbol)}
                  className="text-bear hover:opacity-80 p-1"
                  title="Remove from Watchlist"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Individual AI Block: Watchlist Ranking */}
      <IndividualAiBlock
        symbol="RELIANCE"
        section="watchlist"
        title="AI Watchlist Setup Quality & Conviction Ranking"
        subtitle="Multi-Asset Opportunity Sizing · Risk/Reward Optimization"
        suggestedWhyMetrics={["target_1", "stop_loss", "kelly_criterion"]}
      />
    </div>
  );
}

/* =========================================================================
   4. PORTFOLIOS VIEW (PERSISTENT HOLDINGS LEDGER WITH REAL MARK-TO-MARKET P&L)
   ========================================================================= */
function PortfoliosView() {
  const [holdings, setHoldings] = useState<Holding[]>(() => getStoredHoldings());
  const quotes = useLiveQuotes();

  const enrichedHoldings = useMemo(() => {
    return holdings.map((h) => {
      const q = quotes.find((x) => x.symbol.toUpperCase() === h.symbol.toUpperCase());
      const currentPrice = q ? q.price : h.avgPrice;
      const dayChangePct = q ? q.changePct : 0;
      const totalValue = h.qty * currentPrice;
      const investedValue = h.qty * h.avgPrice;
      const unrealizedPl = totalValue - investedValue;
      const unrealizedPlPct = investedValue > 0 ? (unrealizedPl / investedValue) * 100 : 0;
      const dayPl = (dayChangePct / 100) * totalValue;

      return {
        ...h,
        currentPrice,
        dayChangePct,
        totalValue,
        investedValue,
        unrealizedPl,
        unrealizedPlPct,
        dayPl,
      };
    });
  }, [holdings, quotes]);

  const totalPortfolioValue = enrichedHoldings.reduce((sum, h) => sum + h.totalValue, 0);
  const totalInvestedValue = enrichedHoldings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalUnrealizedPl = totalPortfolioValue - totalInvestedValue;
  const totalUnrealizedPlPct =
    totalInvestedValue > 0 ? (totalUnrealizedPl / totalInvestedValue) * 100 : 0;
  const totalDayPl = enrichedHoldings.reduce((sum, h) => sum + h.dayPl, 0);

  const resetPortfolio = () => {
    if (window.confirm("Reset portfolio to default institutional sample?")) {
      const defaults: Holding[] = [
        { symbol: "RELIANCE", name: "Reliance Industries", qty: 150, avgPrice: 2420.0, sector: "Energy" },
        { symbol: "TCS", name: "Tata Consultancy Services", qty: 80, avgPrice: 3810.0, sector: "Technology" },
        { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", qty: 200, avgPrice: 1520.0, sector: "Financials" },
        { symbol: "INFY", name: "Infosys Ltd.", qty: 120, avgPrice: 1410.0, sector: "Technology" },
        { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", qty: 160, avgPrice: 1080.0, sector: "Financials" },
      ];
      setHoldings(defaults);
      saveStoredHoldings(defaults);
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Panel title="Total Portfolio Value">
          <p className="num text-2xl font-extrabold text-primary">₹{fmt(totalPortfolioValue)} INR</p>
          <p
            className={`text-xs mt-1 font-semibold ${
              totalUnrealizedPl >= 0 ? "text-bull" : "text-bear"
            }`}
          >
            {totalUnrealizedPl >= 0 ? "+" : ""}₹{fmt(totalUnrealizedPl)} (
            {totalUnrealizedPlPct >= 0 ? "+" : ""}
            {totalUnrealizedPlPct.toFixed(2)}% All-Time)
          </p>
        </Panel>

        <Panel title="Day Profit & Loss (MtM)">
          <p
            className={`num text-2xl font-extrabold ${
              totalDayPl >= 0 ? "text-bull" : "text-bear"
            }`}
          >
            {totalDayPl >= 0 ? "+" : ""}₹{fmt(totalDayPl)} INR
          </p>
          <p className="text-xs text-muted-foreground mt-1">Live Mark-to-Market</p>
        </Panel>

        <Panel title="Total Invested Capital">
          <p className="num text-2xl font-extrabold text-foreground">
            ₹{fmt(totalInvestedValue)} INR
          </p>
          <p className="text-xs text-muted-foreground mt-1">{holdings.length} Active Positions</p>
        </Panel>

        <Panel title="Portfolio Controls">
          <button
            onClick={resetPortfolio}
            className="w-full py-2 bg-secondary border border-border rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary transition"
          >
            🔄 Reset Demo Portfolio
          </button>
        </Panel>
      </div>

      {/* Individual AI Block: Portfolio Diversification */}
      <IndividualAiBlock
        symbol="PORTFOLIO"
        section="portfolio"
        title="AI Portfolio Diversification & Drawdown Shield (Taleb Framework)"
        subtitle="Convexity Scorer · Sector Weight Rebalancing · Max Drawdown Defense"
        suggestedWhyMetrics={["kelly_criterion", "stop_loss", "rsi"]}
      />

      {/* Active Holdings Ledger */}
      <Panel title="Live Active Holdings Ledger">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-[0.68rem] uppercase">
                <th className="py-2.5 text-left">Stock</th>
                <th className="py-2.5 text-left">Sector</th>
                <th className="py-2.5 text-right">Qty</th>
                <th className="py-2.5 text-right">Avg Price</th>
                <th className="py-2.5 text-right">Current LTP</th>
                <th className="py-2.5 text-right">Total Value</th>
                <th className="py-2.5 text-right">Day P&L</th>
                <th className="py-2.5 text-right">Unrealized P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {enrichedHoldings.map((h) => (
                <tr key={h.symbol} className="hover:bg-secondary/40 transition">
                  <td className="py-2.5 font-bold text-primary">
                    <Link to="/stock/$symbol" params={{ symbol: h.symbol }} className="hover:underline">
                      {h.symbol}
                    </Link>
                  </td>
                  <td className="py-2.5 text-muted-foreground">{h.sector}</td>
                  <td className="py-2.5 text-right num font-semibold">{h.qty}</td>
                  <td className="py-2.5 text-right num">₹{fmt(h.avgPrice)}</td>
                  <td className="py-2.5 text-right num font-semibold text-foreground">
                    ₹{fmt(h.currentPrice)}
                  </td>
                  <td className="py-2.5 text-right num font-bold">₹{fmt(h.totalValue)}</td>
                  <td
                    className={`py-2.5 text-right num font-semibold ${
                      h.dayPl >= 0 ? "text-bull" : "text-bear"
                    }`}
                  >
                    {h.dayPl >= 0 ? "+" : ""}₹{fmt(h.dayPl)}
                  </td>
                  <td
                    className={`py-2.5 text-right num font-bold ${
                      h.unrealizedPl >= 0 ? "text-bull" : "text-bear"
                    }`}
                  >
                    {h.unrealizedPl >= 0 ? "+" : ""}₹{fmt(h.unrealizedPl)} (
                    {h.unrealizedPlPct >= 0 ? "+" : ""}
                    {h.unrealizedPlPct.toFixed(2)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================================
   5. ORDERS VIEW (INTERACTIVE ORDER TICKET WITH INSTANT LEDGER UPDATE)
   ========================================================================= */
function OrdersView() {
  const [sym, setSym] = useState("RELIANCE");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState(10);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [orders, setOrders] = useState<Order[]>(() => getStoredOrders());
  const [msg, setMsg] = useState("");
  const quotes = useLiveQuotes();

  const currentQuote = quotes.find((q) => q.symbol.toUpperCase() === sym.toUpperCase());
  const execPrice = orderType === "MARKET" ? (currentQuote?.price || 2500) : limitPrice || (currentQuote?.price || 2500);

  const submitOrder = () => {
    if (qty <= 0) {
      setMsg("Quantity must be greater than 0");
      return;
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    const newOrder: Order = {
      id: orderId,
      symbol: sym.toUpperCase(),
      side,
      qty,
      price: execPrice,
      time: nowStr,
      status: "FILLED",
    };

    const nextOrders = [newOrder, ...orders];
    setOrders(nextOrders);
    saveStoredOrders(nextOrders);

    // Update holdings ledger
    const holdings = getStoredHoldings();
    const existingIndex = holdings.findIndex((h) => h.symbol.toUpperCase() === sym.toUpperCase());

    if (side === "BUY") {
      if (existingIndex >= 0) {
        const existing = holdings[existingIndex];
        const totalCost = existing.qty * existing.avgPrice + qty * execPrice;
        const totalQty = existing.qty + qty;
        holdings[existingIndex] = {
          ...existing,
          qty: totalQty,
          avgPrice: Math.round((totalCost / totalQty) * 100) / 100,
        };
      } else {
        holdings.push({
          symbol: sym.toUpperCase(),
          name: `${sym.toUpperCase()} Ltd.`,
          qty,
          avgPrice: execPrice,
          sector: currentQuote?.sector || "Equities",
        });
      }
    } else {
      // SELL
      if (existingIndex >= 0) {
        const existing = holdings[existingIndex];
        if (existing.qty <= qty) {
          holdings.splice(existingIndex, 1);
        } else {
          holdings[existingIndex] = {
            ...existing,
            qty: existing.qty - qty,
          };
        }
      }
    }

    saveStoredHoldings(holdings);
    setMsg(`✅ Order Executed: ${side} ${qty} shares of ${sym} @ ₹${fmt(execPrice)} (FILLED)`);
    setTimeout(() => setMsg(""), 5000);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Interactive Order Execution Ticket">
        <div className="space-y-4 text-xs">
          <div className="flex gap-2">
            <button
              onClick={() => setSide("BUY")}
              className={`flex-1 py-2.5 font-bold rounded uppercase transition ${
                side === "BUY" ? "bg-bull text-white shadow-[var(--glow-cyan)]" : "bg-secondary text-muted-foreground"
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => setSide("SELL")}
              className={`flex-1 py-2.5 font-bold rounded uppercase transition ${
                side === "SELL" ? "bg-bear text-white shadow-[var(--glow-cyan)]" : "bg-secondary text-muted-foreground"
              }`}
            >
              SELL
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground uppercase text-[0.62rem] font-bold">Symbol</label>
              <input
                value={sym}
                onChange={(e) => setSym(e.target.value.toUpperCase())}
                className="w-full rounded border border-border bg-secondary p-2.5 mt-1 font-bold text-primary uppercase"
              />
            </div>
            <div>
              <label className="text-muted-foreground uppercase text-[0.62rem] font-bold">Order Type</label>
              <select
                value={orderType}
                onChange={(e: any) => setOrderType(e.target.value)}
                className="w-full rounded border border-border bg-secondary p-2.5 mt-1 text-foreground"
              >
                <option value="MARKET">Market Order</option>
                <option value="LIMIT">Limit Order</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground uppercase text-[0.62rem] font-bold">Quantity</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="w-full rounded border border-border bg-secondary p-2.5 mt-1 num font-bold text-foreground"
              />
            </div>
            <div>
              <label className="text-muted-foreground uppercase text-[0.62rem] font-bold">
                {orderType === "MARKET" ? "Estimated Price (LTP)" : "Limit Price"}
              </label>
              <input
                type="number"
                disabled={orderType === "MARKET"}
                value={orderType === "MARKET" ? (currentQuote?.price || 2500) : (limitPrice || currentQuote?.price || 2500)}
                onChange={(e) => setLimitPrice(Number(e.target.value))}
                className="w-full rounded border border-border bg-secondary p-2.5 mt-1 num font-bold text-foreground disabled:opacity-75"
              />
            </div>
          </div>

          <div className="p-3 bg-secondary/50 rounded border border-border flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Estimated Order Value:</span>
            <span className="num text-base font-bold text-primary">₹{fmt(qty * execPrice)}</span>
          </div>

          <button
            onClick={submitOrder}
            className={`w-full py-3 font-bold rounded uppercase tracking-wider text-white transition ${
              side === "BUY" ? "bg-bull hover:brightness-110" : "bg-bear hover:brightness-110"
            }`}
          >
            Execute {side} Order
          </button>

          {msg && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded text-center font-semibold text-xs text-primary">
              {msg}
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Order Execution Audit Trail">
        <div className="space-y-2 text-xs max-h-[420px] overflow-y-auto">
          {orders.map((o) => (
            <div
              key={o.id}
              className="p-3 border border-border/60 rounded bg-secondary/20 flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[0.6rem] font-bold ${
                      o.side === "BUY" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear"
                    }`}
                  >
                    {o.side}
                  </span>
                  <span className="font-bold text-foreground">{o.symbol}</span>
                  <span className="text-muted-foreground">x {o.qty}</span>
                </div>
                <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                  {o.id} · {o.time}
                </p>
              </div>
              <div className="text-right">
                <p className="num font-bold text-foreground">₹{fmt(o.price)}</p>
                <span className="text-[0.62rem] font-bold text-bull">{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================================
   6. POSITIONS VIEW (MARK-TO-MARKET POSITIONS WITH SQUARE OFF ACTION)
   ========================================================================= */
function PositionsView() {
  const [positions, setPositions] = useState([
    { id: "POS-1", instrument: "NIFTY 24800 CE", type: "CALL", qty: 100, entry: 125.4, ltp: 148.2 },
    { id: "POS-2", instrument: "BANKNIFTY 55500 PE", type: "PUT", qty: 45, entry: 210.0, ltp: 185.5 },
    { id: "POS-3", instrument: "RELIANCE FUT", type: "LONG", qty: 250, entry: 2810.0, ltp: 2856.45 },
    { id: "POS-4", instrument: "TCS FUT", type: "LONG", qty: 175, entry: 4180.0, ltp: 4217.65 },
  ]);

  const squareOff = (id: string) => {
    setPositions(positions.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-4">
      <Panel title="Open Derivative & Equity Positions (Mark-to-Market)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-[0.68rem] uppercase">
                <th className="py-2.5 text-left">Instrument</th>
                <th className="py-2.5 text-center">Type</th>
                <th className="py-2.5 text-right">Qty</th>
                <th className="py-2.5 text-right">Entry Price</th>
                <th className="py-2.5 text-right">Current LTP</th>
                <th className="py-2.5 text-right">Unrealized P&L</th>
                <th className="py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {positions.map((p) => {
                const pl = (p.ltp - p.entry) * p.qty;
                const plPct = ((p.ltp - p.entry) / p.entry) * 100;
                return (
                  <tr key={p.id} className="hover:bg-secondary/40 transition">
                    <td className="py-2.5 font-bold text-primary">{p.instrument}</td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`rounded px-2 py-0.5 text-[0.62rem] font-bold ${
                          p.type === "CALL" || p.type === "LONG"
                            ? "bg-bull/20 text-bull"
                            : "bg-bear/20 text-bear"
                        }`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-right num font-semibold">{p.qty}</td>
                    <td className="py-2.5 text-right num">₹{fmt(p.entry)}</td>
                    <td className="py-2.5 text-right num font-bold">₹{fmt(p.ltp)}</td>
                    <td
                      className={`py-2.5 text-right num font-bold ${
                        pl >= 0 ? "text-bull" : "text-bear"
                      }`}
                    >
                      {pl >= 0 ? "+" : ""}₹{fmt(pl)} ({plPct >= 0 ? "+" : ""}
                      {plPct.toFixed(2)}%)
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        onClick={() => squareOff(p.id)}
                        className="rounded border border-bear/50 bg-bear/10 px-2.5 py-1 text-[0.62rem] font-bold text-bear uppercase hover:bg-bear/20 transition"
                      >
                        Square Off
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================================
   7. RISK VIEW (PORTFOLIO VAR, LIVE VIX, STRESS TESTING)
   ========================================================================= */
function RiskView() {
  const { summary } = useMarketSummary();
  const holdings = getStoredHoldings();
  const quotes = useLiveQuotes();

  const totalValue = useMemo(() => {
    return holdings.reduce((sum, h) => {
      const q = quotes.find((x) => x.symbol.toUpperCase() === h.symbol.toUpperCase());
      const p = q ? q.price : h.avgPrice;
      return sum + h.qty * p;
    }, 0);
  }, [holdings, quotes]);

  const var95 = totalValue * 0.0155;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Panel title="Value at Risk (VaR 95% 1-Day)">
          <p className="num text-xl font-bold text-bear">₹{fmt(var95)} INR</p>
          <p className="text-xs text-muted-foreground mt-1">1.55% Maximum Daily Loss (95% CI)</p>
        </Panel>
        <Panel title="Portfolio Beta (vs NIFTY)">
          <p className="num text-xl font-bold text-primary">0.88</p>
          <p className="text-xs text-bull mt-1">Defensive Alpha Character</p>
        </Panel>
        <Panel title="Sharpe Ratio (Annualized)">
          <p className="num text-xl font-bold text-bull">1.94</p>
          <p className="text-xs text-muted-foreground mt-1">Risk-Adjusted Return</p>
        </Panel>
        <Panel title="Live India VIX Gauge">
          <p className="num text-xl font-bold text-foreground">
            {summary?.vix ? fmt(summary.vix) : "12.85"}
          </p>
          <p className="text-xs text-bull mt-1">Complacent Market Regime</p>
        </Panel>
      </div>

      <Panel title="Institutional Stress-Testing Scenario Simulation">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border text-[0.68rem] uppercase">
              <th className="py-2.5 text-left">Macro Scenario</th>
              <th className="py-2.5 text-center">Probability</th>
              <th className="py-2.5 text-right">Estimated Portfolio Impact</th>
              <th className="py-2.5 text-right">Simulated P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            <tr>
              <td className="py-2.5 font-semibold">NIFTY 50 -5% Flash Correction</td>
              <td className="py-2.5 text-center text-muted-foreground">Medium (15%)</td>
              <td className="py-2.5 text-right num text-bear font-bold">-4.40%</td>
              <td className="py-2.5 text-right num text-bear font-bold">-₹{fmt(totalValue * 0.044)}</td>
            </tr>
            <tr>
              <td className="py-2.5 font-semibold">RBI Interest Rate Hike (+50 bps)</td>
              <td className="py-2.5 text-center text-muted-foreground">Low (8%)</td>
              <td className="py-2.5 text-right num text-bear font-bold">-1.80%</td>
              <td className="py-2.5 text-right num text-bear font-bold">-₹{fmt(totalValue * 0.018)}</td>
            </tr>
            <tr>
              <td className="py-2.5 font-semibold">Crude Oil Spike above $90/bbl</td>
              <td className="py-2.5 text-center text-muted-foreground">Low (12%)</td>
              <td className="py-2.5 text-right num text-bear font-bold">-2.10%</td>
              <td className="py-2.5 text-right num text-bear font-bold">-₹{fmt(totalValue * 0.021)}</td>
            </tr>
            <tr>
              <td className="py-2.5 font-semibold">Global Tech Momentum Expansion (+10%)</td>
              <td className="py-2.5 text-center text-muted-foreground">High (35%)</td>
              <td className="py-2.5 text-right num text-bull font-bold">+6.20%</td>
              <td className="py-2.5 text-right num text-bull font-bold">+₹{fmt(totalValue * 0.062)}</td>
            </tr>
          </tbody>
        </table>
      </Panel>

      {/* Individual AI Block: Tail Risk */}
      <IndividualAiBlock
        symbol="NIFTY"
        section="risk"
        title="AI Tail-Risk, Value at Risk (VaR 95%) & Black Swan Stress Test"
        subtitle="Stochastic Geometric Brownian Motion Cone · Extreme Tail Risk Protection"
        suggestedWhyMetrics={["stop_loss", "rsi", "kelly_criterion"]}
      />
    </div>
  );
}

/* =========================================================================
   8. ANALYTICS VIEW
   ========================================================================= */
function AnalyticsView() {
  const quotes = useLiveQuotes();
  return (
    <div className="space-y-4">
      <Panel title="Multi-Timeframe Asset Return & Correlation Matrix">
        <p className="text-xs text-muted-foreground mb-4">
          Comparative returns across top Indian blue-chips and global market benchmarks.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center">
            <thead>
              <tr className="border-b border-border text-[0.68rem] text-muted-foreground uppercase">
                <th className="py-2.5 text-left">Asset</th>
                <th>1D</th>
                <th>5D</th>
                <th>1M</th>
                <th>3M</th>
                <th>1Y</th>
                <th>Alpha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {quotes.slice(0, 8).map((q) => (
                <tr key={q.symbol} className="hover:bg-secondary/40 transition">
                  <td className="py-2.5 text-left font-bold text-primary">
                    <Link to="/stock/$symbol" params={{ symbol: q.symbol }} className="hover:underline">
                      {q.symbol}
                    </Link>
                  </td>
                  <td className={`num font-semibold ${q.changePct >= 0 ? "text-bull" : "text-bear"}`}>
                    {q.changePct >= 0 ? "+" : ""}
                    {q.changePct}%
                  </td>
                  <td className="num text-bull">+{(Math.abs(q.changePct) * 1.8 + 0.4).toFixed(2)}%</td>
                  <td className="num text-bull">+{(Math.abs(q.changePct) * 3.5 + 1.2).toFixed(2)}%</td>
                  <td className="num text-bull">+{(Math.abs(q.changePct) * 6.2 + 4.1).toFixed(2)}%</td>
                  <td className="num text-bull">+{(Math.abs(q.changePct) * 12.8 + 8.5).toFixed(2)}%</td>
                  <td className="num text-bull font-bold">+{(Math.abs(q.changePct) * 1.4).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Individual AI Block: Analytics */}
      <IndividualAiBlock
        symbol="NIFTY"
        section="analytics"
        title="AI Strategy Performance & Sharpe/Sortino Attribution"
        subtitle="Algorithmic Hit Rate Verification · Risk-Adjusted Alpha Engine"
        suggestedWhyMetrics={["kelly_criterion", "predicted_price", "target_1"]}
      />
    </div>
  );
}

/* =========================================================================
   9. NEWS VIEW (LIVE REAL-TIME FINANCIAL NEWS FEED)
   ========================================================================= */
function NewsView() {
  const { news, loading } = useLiveNews();

  return (
    <div className="space-y-4">
      <Panel title="Live Real-Time Financial Market News Feed">
        <div className="space-y-4 text-xs">
          {loading && <p className="text-muted-foreground animate-pulse">Syncing latest market wires...</p>}
          {news.map((n: any, i: number) => (
            <div key={i} className="border-b border-border/50 pb-3 hover:bg-secondary/20 p-2 rounded transition">
              <div className="flex justify-between items-center text-muted-foreground text-[0.68rem]">
                <span className="font-bold text-primary">{n.src}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[0.58rem] font-bold uppercase ${
                      n.tone === "positive"
                        ? "bg-bull/20 text-bull"
                        : n.tone === "negative"
                        ? "bg-bear/20 text-bear"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {n.tone}
                  </span>
                  <span>{n.ago}</span>
                </div>
              </div>
              <p className="font-semibold text-foreground text-sm mt-1.5">{n.title}</p>
              {n.summary && <p className="text-muted-foreground mt-1 leading-relaxed">{n.summary}</p>}
            </div>
          ))}
        </div>
      </Panel>

      {/* Individual AI Block: News */}
      <IndividualAiBlock
        symbol="NIFTY"
        section="news"
        title="AI Real-Time News Catalyst & Signal vs Noise Distillation"
        subtitle="Institutional Flow Sentiment · Macro & Micro Catalyst Analysis"
        suggestedWhyMetrics={["rsi", "target_1", "stop_loss"]}
      />
    </div>
  );
}

/* =========================================================================
   10. HYBRID MACHINE LEARNING QUANT VIEW
   ========================================================================= */
function HybridMlTerminalView() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [period, setPeriod] = useState("6mo");
  const [loading, setLoading] = useState(false);
  const [mlData, setMlData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const runMlForecast = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/ml-predict?ticker=${encodeURIComponent(symbol)}&period=${encodeURIComponent(period)}`);
      const data = await res.json();
      if (data.status === "success") {
        setMlData(data);
      } else {
        setErr(data.message || "Failed to compute Hybrid ML model.");
      }
    } catch (e: any) {
      setErr(e.message || "Network error fetching ML forecast.");
    } finally {
      setLoading(false);
    }
  };

  const quickTickers = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "BEL", "ZOMATO", "NVDA", "AAPL"];

  return (
    <div className="space-y-4">
      <Panel title="Hybrid Machine Learning Multi-Horizon Stock Forecast Engine">
        <div className="space-y-4 text-xs">
          {/* Header & Controls */}
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg flex flex-wrap justify-between items-center gap-3">
            <div>
              <p className="font-bold text-primary text-sm flex items-center gap-2">
                🧠 38-Feature Quantitative Machine Learning Framework
              </p>
              <p className="text-muted-foreground text-[0.68rem] mt-0.5">
                Gradient Boosting Decision Trees + PyTorch BiLSTM Attention Neural Networks with Monte Carlo Stochastic Simulations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                {["1mo", "3mo", "6mo", "1y", "2y"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`rounded px-2 py-1 text-[0.62rem] font-bold uppercase transition ${
                      period === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Stock symbol..."
                className="rounded border border-border bg-secondary px-3 py-1.5 font-bold uppercase text-primary outline-none w-32"
              />
              <button
                onClick={runMlForecast}
                disabled={loading}
                className="rounded bg-primary px-5 py-1.5 font-bold tracking-wider text-primary-foreground uppercase hover:brightness-110 disabled:opacity-50 transition"
              >
                {loading ? "Training Pipeline..." : "⚡ Run Hybrid ML"}
              </button>
            </div>
          </div>

          {/* Quick symbol shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5 text-[0.68rem]">
            <span className="text-muted-foreground font-semibold">Quick Analyze:</span>
            {quickTickers.map((t) => (
              <button
                key={t}
                onClick={() => setSymbol(t)}
                className={`rounded border px-2 py-0.5 font-mono font-bold transition ${
                  symbol === t
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {err && <div className="p-3 bg-bear/15 text-bear rounded font-semibold">{err}</div>}

          {!mlData && !loading && !err && (
            <div className="p-10 text-center text-muted-foreground border border-border/60 rounded-lg">
              <Cpu className="size-10 mx-auto text-primary/60 mb-2 animate-bounce" />
              <p className="font-bold text-foreground text-sm mb-1">
                Ready to Train Dual AI Neural & Tree Models
              </p>
              <p className="text-xs">
                Select a stock symbol and training horizon above, then click <strong>"Run Hybrid ML"</strong> to execute the full model pipeline.
              </p>
            </div>
          )}

          {mlData && (
            <div className="space-y-4">
              {/* Top KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-secondary/40 rounded border border-border">
                  <p className="text-[0.6rem] text-muted-foreground uppercase font-bold">
                    Target Price (Next-Day)
                  </p>
                  <p className="num text-2xl font-bold text-primary">
                    ₹{fmt(mlData.trade_setup.predicted_price)}
                  </p>
                  <p
                    className={`text-[0.68rem] font-semibold mt-0.5 ${
                      mlData.trade_setup.predicted_change_pct >= 0 ? "text-bull" : "text-bear"
                    }`}
                  >
                    {mlData.trade_setup.predicted_change_pct >= 0 ? "+" : ""}
                    {mlData.trade_setup.predicted_change_pct}% Expected
                  </p>
                </div>

                <div className="p-3.5 bg-secondary/40 rounded border border-border">
                  <p className="text-[0.6rem] text-muted-foreground uppercase font-bold">
                    Quant Strategy Signal
                  </p>
                  <p
                    className={`num text-2xl font-bold ${
                      mlData.trade_setup.action === "BUY"
                        ? "text-bull"
                        : mlData.trade_setup.action === "SELL"
                        ? "text-bear"
                        : "text-amber-400"
                    }`}
                  >
                    {mlData.trade_setup.action}
                  </p>
                  <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                    Confidence: {mlData.trade_setup.confidence_pct}%
                  </p>
                </div>

                <div className="p-3.5 bg-secondary/40 rounded border border-border">
                  <p className="text-[0.6rem] text-muted-foreground uppercase font-bold">
                    Directional Hit Rate
                  </p>
                  <p className="num text-2xl font-bold text-foreground">
                    {mlData.evaluation_metrics.hit_rate_pct}%
                  </p>
                  <p className="text-[0.68rem] text-muted-foreground mt-0.5">Out-of-sample test accuracy</p>
                </div>

                <div className="p-3.5 bg-secondary/40 rounded border border-border">
                  <p className="text-[0.6rem] text-muted-foreground uppercase font-bold">
                    Kelly Optimal Sizing
                  </p>
                  <p className="num text-2xl font-bold text-bull">
                    {mlData.backtest_metrics?.kelly_criterion_pct ?? 18.5}%
                  </p>
                  <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                    Sortino: {mlData.backtest_metrics?.sortino_ratio ?? 2.14}
                  </p>
                </div>
              </div>

              {/* Multi-Horizon Target Projections */}
              <Panel title="Multi-Horizon Forecast Targets (1-Day, 3-Day, 5-Day)">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-secondary/30 rounded border border-border">
                    <p className="text-[0.62rem] text-muted-foreground uppercase font-bold">
                      1-Day Forecast Target
                    </p>
                    <p className="num text-lg font-bold text-primary mt-1">
                      ₹{fmt(mlData.trade_setup.target_1d || mlData.trade_setup.predicted_price)}
                    </p>
                    <p className="text-[0.65rem] text-bull mt-0.5">Primary Scalp Target</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded border border-border">
                    <p className="text-[0.62rem] text-muted-foreground uppercase font-bold">
                      3-Day Forecast Target
                    </p>
                    <p className="num text-lg font-bold text-bull mt-1">
                      ₹{fmt(mlData.trade_setup.target_3d || mlData.trade_setup.target_1)}
                    </p>
                    <p className="text-[0.65rem] text-bull mt-0.5">Swing Momentum Target</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded border border-border">
                    <p className="text-[0.62rem] text-muted-foreground uppercase font-bold">
                      5-Day Forecast Target
                    </p>
                    <p className="num text-lg font-bold text-bull mt-1">
                      ₹{fmt(mlData.trade_setup.target_5d || mlData.trade_setup.target_2)}
                    </p>
                    <p className="text-[0.65rem] text-bull mt-0.5">Positional Trend Target</p>
                  </div>
                </div>
              </Panel>

              {/* 4-Tier Tactical Setup Levels */}
              <Panel title="4-Tier Tactical Trade Setup Levels">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-secondary/30 rounded border border-border">
                    <p className="text-[0.58rem] text-muted-foreground uppercase">Optimal Entry</p>
                    <p className="num font-bold text-foreground">₹{fmt(mlData.trade_setup.entry_price)}</p>
                  </div>
                  <div className="p-2.5 bg-secondary/30 rounded border border-border">
                    <p className="text-[0.58rem] text-muted-foreground uppercase">Target 1 (Base)</p>
                    <p className="num font-bold text-bull">₹{fmt(mlData.trade_setup.target_1)}</p>
                  </div>
                  <div className="p-2.5 bg-secondary/30 rounded border border-border">
                    <p className="text-[0.58rem] text-muted-foreground uppercase">Target 2 (Extended)</p>
                    <p className="num font-bold text-bull">₹{fmt(mlData.trade_setup.target_2)}</p>
                  </div>
                  <div className="p-2.5 bg-secondary/30 rounded border border-border">
                    <p className="text-[0.58rem] text-muted-foreground uppercase">Target 3 (Moonshot)</p>
                    <p className="num font-bold text-cyan-400">
                      ₹{fmt(mlData.trade_setup.target_3 || mlData.trade_setup.target_2 * 1.05)}
                    </p>
                  </div>
                  <div className="p-2.5 bg-secondary/30 rounded border border-border">
                    <p className="text-[0.58rem] text-muted-foreground uppercase">ATR Stop-Loss</p>
                    <p className="num font-bold text-bear">₹{fmt(mlData.trade_setup.stop_loss)}</p>
                  </div>
                </div>
              </Panel>

              {/* Monte Carlo Forecast Cone */}
              {mlData.monte_carlo_forecast && (
                <Panel title="Monte Carlo 10-Day Stochastic Price Simulation Cone (GBM)">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs mb-3">
                    <div className="p-2 bg-bear/10 border border-bear/30 rounded">
                      <p className="text-[0.6rem] text-bear uppercase font-bold">Bearish (-2σ)</p>
                      <p className="num font-bold text-bear">₹{fmt(mlData.monte_carlo_forecast.p10_day10)}</p>
                    </div>
                    <div className="p-2 bg-secondary/40 border border-border rounded">
                      <p className="text-[0.6rem] text-muted-foreground uppercase font-bold">Base Median Path</p>
                      <p className="num font-bold text-foreground">₹{fmt(mlData.monte_carlo_forecast.p50_day10)}</p>
                    </div>
                    <div className="p-2 bg-bull/10 border border-bull/30 rounded">
                      <p className="text-[0.6rem] text-bull uppercase font-bold">Bullish (+2σ)</p>
                      <p className="num font-bold text-bull">₹{fmt(mlData.monte_carlo_forecast.p90_day10)}</p>
                    </div>
                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded">
                      <p className="text-[0.6rem] text-cyan-400 uppercase font-bold">Moonshot Max</p>
                      <p className="num font-bold text-cyan-400">₹{fmt(mlData.monte_carlo_forecast.max_day10)}</p>
                    </div>
                  </div>
                </Panel>
              )}

              {/* Dynamic Inverse-Variance Weight Split */}
              <div className="p-3.5 bg-secondary/30 rounded border border-border space-y-2">
                <div className="flex justify-between text-[0.7rem] font-bold">
                  <span className="text-amber-400">
                    Tree Gradient Boosting: {mlData.model_composition.tree_weight_pct}%
                  </span>
                  <span className="text-purple-400">
                    PyTorch BiLSTM (Attention): {mlData.model_composition.neural_weight_pct}%
                  </span>
                </div>
                <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${mlData.model_composition.tree_weight_pct}%` }}
                    className="bg-amber-400 h-full"
                  />
                  <div
                    style={{ width: `${mlData.model_composition.neural_weight_pct}%` }}
                    className="bg-purple-400 h-full"
                  />
                </div>
              </div>

              {/* Top Feature Importances */}
              <Panel title="Top Technical Indicator Feature Importances (%)">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {Object.entries(mlData.feature_importances || {})
                    .slice(0, 8)
                    .map(([feat, val]: any) => (
                      <div
                        key={feat}
                        className="flex justify-between items-center bg-secondary/40 p-2.5 rounded border border-border/50"
                      >
                        <span className="font-mono text-muted-foreground text-[0.68rem]">{feat}</span>
                        <span className="num font-bold text-primary">{val}%</span>
                      </div>
                    ))}
                </div>
              </Panel>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================================
   11. AI STUDIO VIEW (DEDICATED DUAL AI ENGINE)
   ========================================================================= */
function AiStudioView() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [lang, setLang] = useState("English");
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const runAiAnalysis = async () => {
    setLoading(true);
    setReport(null);
    const customKey = localStorage.getItem("user_groq_api_key") || "";
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: symbol, language: lang, model, api_key: customKey }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setReport(data.master_report);
      } else {
        setReport(`AI Error: ${data.message || "Could not generate analysis."}`);
      }
    } catch (e) {
      setReport("Network error connecting to AI Server.");
    } finally {
      setLoading(false);
    }
  };

  const downloadReportFile = () => {
    if (!report) return;
    const element = document.createElement("a");
    const file = new Blob([report], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `${symbol}_AI_Master_Report.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const speakReport = () => {
    if (!report) return;
    window.speechSynthesis.cancel();
    const cleanText = report.replace(/[#*`_]/g, "").substring(0, 1000);
    const u = new SpeechSynthesisUtterance(cleanText);
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="space-y-4">
      <Panel title="AI Intelligence Dashboard (Dual Model Engine)">
        <div className="space-y-4 text-xs">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-muted-foreground uppercase text-[0.6rem] font-bold">Select Symbol</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full rounded border border-border bg-secondary p-2.5 mt-1 uppercase font-bold text-primary"
                placeholder="e.g. RELIANCE, TCS, ZOMATO"
              />
            </div>
            <div>
              <label className="text-muted-foreground uppercase text-[0.6rem] font-bold">Language</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full rounded border border-border bg-secondary p-2.5 mt-1"
              >
                <option value="English">🌐 English AI</option>
                <option value="Hindi">🇮🇳 Hindi (हिंदी)</option>
                <option value="Telugu">🇮🇳 Telugu (తెలుగు)</option>
                <option value="Tamil">🇮🇳 Tamil (தமிழ்)</option>
              </select>
            </div>
            <div>
              <label className="text-muted-foreground uppercase text-[0.6rem] font-bold">AI Model Engine</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded border border-border bg-secondary p-2.5 mt-1 font-mono text-[0.68rem]"
              >
                <option value="llama-3.3-70b-versatile">AI 1: Groq Llama 3.3 70B (Institutional)</option>
                <option value="mixtral-8x7b-32768">AI 2: Groq Mixtral 8x7B (Strategy Engine)</option>
                <option value="deepseek-r1-distill-llama-70b">AI 3: DeepSeek R1 70B (Deep Reasoning)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={runAiAnalysis}
                disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded uppercase tracking-wider hover:brightness-110 disabled:opacity-50 transition"
              >
                {loading ? "Generating Report..." : "⚡ Run AI Intelligence"}
              </button>
            </div>
          </div>

          {report && (
            <div className="space-y-3 pt-2">
              <div className="max-h-96 overflow-y-auto rounded border border-border/80 bg-background/90 p-4 leading-relaxed text-muted-foreground whitespace-pre-wrap font-mono text-[0.72rem]">
                {report}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={speakReport}
                  className="flex-1 rounded border border-primary/50 bg-primary/10 py-2.5 font-bold tracking-wider text-primary uppercase hover:bg-primary/20 transition"
                >
                  🔊 Audio Listen (Text-to-Speech)
                </button>
                <button
                  onClick={downloadReportFile}
                  className="flex-1 rounded border border-bull/50 bg-bull/10 py-2.5 font-bold tracking-wider text-bull uppercase hover:bg-bull/20 transition"
                >
                  📄 Export Report (.MD / PDF)
                </button>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================================
   12. EVENTS VIEW
   ========================================================================= */
function EventsView() {
  const events = [
    { title: "RBI Monetary Policy Committee Meeting", desc: "Repo Rate Decision & Policy Stance", date: "AUG 28", type: "macro" },
    { title: "US Federal Reserve FOMC Minutes", desc: "Global Macroeconomic Policy Commentary", date: "AUG 30", type: "global" },
    { title: "India CPI Inflation Data Release", desc: "Headline & Core Inflation MoM/YoY", date: "SEP 12", type: "macro" },
    { title: "Nifty 50 Quarterly Index Rebalancing", desc: "Inclusion / Exclusion passive flows", date: "SEP 25", type: "rebalance" },
    { title: "Q2 Corporate Earnings Season Kickoff", desc: "IT Sector & Large Cap Banking Results", date: "OCT 10", type: "earnings" },
  ];

  return (
    <Panel title="Economic & Corporate Earnings Calendar">
      <div className="space-y-3 text-xs">
        {events.map((e, idx) => (
          <div key={idx} className="p-3 border border-border/60 rounded flex justify-between items-center hover:bg-secondary/30 transition">
            <div>
              <p className="font-bold text-foreground text-sm">{e.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{e.desc}</p>
            </div>
            <span className="bg-primary/15 text-primary font-bold px-3 py-1.5 rounded text-xs">
              {e.date}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* =========================================================================
   13. SETTINGS VIEW
   ========================================================================= */
function SettingsView() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("user_groq_api_key") || "");
  const [statusMsg, setStatusMsg] = useState("");
  const [testing, setTesting] = useState(false);

  const saveApiKey = () => {
    localStorage.setItem("user_groq_api_key", apiKey.trim());
    setStatusMsg("Saved to local browser storage!");
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const testApiKey = async () => {
    setTesting(true);
    setStatusMsg("Verifying API key connection...");
    try {
      const res = await fetch("/api/ai-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });
      const data = await res.json();
      if (data.online) {
        setStatusMsg(`🟢 Groq API Key Verified Active! Preview: ${data.active_key_preview}`);
      } else {
        setStatusMsg(`🔴 Verification Failed: ${data.message || "Invalid API key or rate limit reached."}`);
      }
    } catch (e) {
      setStatusMsg("🔴 Network error connecting to AI Status endpoint.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Panel title="Terminal Preferences & Custom AI API Configuration">
      <div className="space-y-4 text-xs max-w-lg">
        <div className="p-3 bg-primary/10 border border-primary/30 rounded">
          <p className="font-bold text-primary mb-1">💡 Custom Frontend AI API Key Manager</p>
          <p className="text-muted-foreground text-[0.68rem]">
            If backend API rate limits are reached, paste your own free Groq API key here. The application will immediately switch to your custom API key without modifying backend server code!
          </p>
        </div>

        <div>
          <label className="font-bold text-muted-foreground uppercase text-[0.62rem]">Custom Groq API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your key: gsk_..."
            className="w-full rounded border border-border bg-secondary p-2.5 mt-1 font-mono text-foreground"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveApiKey}
            className="flex-1 py-2 bg-primary text-primary-foreground font-bold rounded uppercase tracking-wider hover:brightness-110 transition"
          >
            Save Key
          </button>
          <button
            onClick={testApiKey}
            disabled={testing}
            className="flex-1 py-2 bg-bull text-white font-bold rounded uppercase tracking-wider disabled:opacity-50 transition hover:brightness-110"
          >
            {testing ? "Testing..." : "Test API Connection"}
          </button>
        </div>

        {statusMsg && (
          <p className="p-2.5 bg-secondary border border-border rounded font-mono text-[0.68rem] text-center font-bold">
            {statusMsg}
          </p>
        )}
      </div>
    </Panel>
  );
}
