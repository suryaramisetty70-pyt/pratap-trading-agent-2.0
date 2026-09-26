import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Search, Bell, Star, User, Radio, Sparkles } from "lucide-react";
import { BASE_QUOTES, INDICES, useClock, useLiveQuotes, useMarketSummary } from "@/lib/market";
import { Delta, LivePrice } from "./primitives";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/terminal", label: "Terminal" },
  { to: "/galaxy", label: "Galaxy 3D" },
  { to: "/stock/$symbol", label: "Stock Analytics", params: { symbol: "RELIANCE" } },
] as const;

export function TopBar() {
  const clock = useClock();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/universe/search?q=${encodeURIComponent(q.trim())}&limit=8`)
        .then((r) => r.json())
        .then((d) => {
          if (d.status === "success" && d.results) {
            setSearchResults(d.results);
          } else {
            // Fallback to local quotes
            const fallback = BASE_QUOTES.filter(
              (s) => s.symbol.toLowerCase().includes(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase())
            ).slice(0, 6);
            setSearchResults(fallback);
          }
          setIsSearching(false);
        })
        .catch(() => {
          const fallback = BASE_QUOTES.filter(
            (s) => s.symbol.toLowerCase().includes(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase())
          ).slice(0, 6);
          setSearchResults(fallback);
          setIsSearching(false);
        });
    }, 120);
  }, [q]);

  const handleSelect = (symbol: string) => {
    navigate({ to: "/stock/$symbol", params: { symbol: symbol.toUpperCase() } });
    setOpen(false);
    setQ("");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 font-display text-lg font-black text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            M
          </span>
          <span className="font-display text-sm font-extrabold tracking-[0.25em] text-foreground uppercase bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
            MAX MARKET
          </span>
        </Link>

        <div className="relative min-w-[220px] flex-1 max-w-2xl">
          <button
            type="button"
            onClick={() => {
              if (q.trim()) handleSelect(q.trim());
            }}
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground hover:text-primary transition"
          >
            <Search className="size-4" />
          </button>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim()) {
                handleSelect(q.trim());
              }
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder="Search 2,586+ stocks (e.g. Zomato, Reliance, Tata, HDFC, SBIN)..."
            className="w-full rounded-lg border border-border/80 bg-secondary/50 py-2 pr-10 pl-9 text-sm outline-none transition focus:border-cyan-500/60 focus:bg-secondary/80 focus:shadow-[0_0_15px_rgba(6,182,212,0.25)] placeholder:text-muted-foreground/70"
          />
          <kbd className="absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border px-1.5 text-[0.65rem] text-muted-foreground bg-background/50">
            ↵
          </kbd>
          {open && searchResults.length > 0 && (
            <ul className="panel absolute top-full left-0 z-50 mt-2 w-full overflow-hidden p-1 shadow-2xl border border-border/80 bg-background/95 backdrop-blur-xl">
              <div className="px-3 py-1.5 text-[0.65rem] font-semibold text-muted-foreground tracking-wider uppercase border-b border-border/40">
                NSE/BSE Universe Matches ({searchResults.length})
              </div>
              {searchResults.map((r: any) => {
                const sym = r.symbol || r.ticker;
                const name = r.company_name || r.name;
                const sector = r.sector || r.industry || "Equities";
                return (
                  <li key={sym}>
                    <button
                      onMouseDown={() => handleSelect(sym)}
                      className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-secondary/70 transition group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground group-hover:text-cyan-400 transition">{sym}</span>
                        <span className="truncate max-w-[280px] text-xs text-muted-foreground">{name}</span>
                      </div>
                      <span className="text-[0.68rem] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {sector}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <nav className="flex items-center gap-1.5 ml-auto">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              {...("params" in n ? { params: n.params as never } : {})}
              activeProps={{ className: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" }}
              className="rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase transition hover:text-foreground hover:bg-secondary/50"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 border-l border-border pl-3 text-xs font-medium text-muted-foreground lg:flex">
          <span className="flex items-center gap-1.5">
            <Radio className="size-3 text-bull animate-pulse" />
            <span className="text-[0.7rem] uppercase tracking-wider text-bull">LIVE</span>
          </span>
          <span className="num text-[0.7rem]">{clock} IST</span>
        </div>
      </div>
    </header>
  );
}

export function TickerTape() {
  const quotes = useLiveQuotes();
  const { summary } = useMarketSummary();

  const items = (summary?.indices && summary.indices.length > 0 ? summary.indices : INDICES).concat(quotes.slice(0, 8));

  return (
    <div className="overflow-hidden border-b border-border bg-card/40 py-1.5">
      <div className="flex w-max animate-marquee items-center gap-8 text-xs">
        {items.concat(items).map((item, i) => {
          const sym = "symbol" in item ? item.symbol : (item as any).ticker;
          const price = item.price;
          const chg = "changePct" in item ? item.changePct : (item as any).change;
          return (
            <div key={`${sym}-${i}`} className="flex items-center gap-2">
              <span className="font-semibold tracking-wider text-muted-foreground">{sym}</span>
              <LivePrice value={price} />
              <Delta value={chg} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WatchlistPanel() {
  const quotes = useLiveQuotes();
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Fast Watchlist</h3>
        <span className="text-[0.65rem] text-muted-foreground">TOP ACTIVE</span>
      </div>
      <div className="space-y-2">
        {quotes.slice(0, 5).map((q) => (
          <Link
            key={q.symbol}
            to="/stock/$symbol"
            params={{ symbol: q.symbol }}
            className="flex items-center justify-between rounded p-2 text-xs transition hover:bg-secondary"
          >
            <div>
              <p className="font-semibold">{q.symbol}</p>
              <p className="text-[0.68rem] text-muted-foreground">{q.name}</p>
            </div>
            <div className="text-right">
              <p className="num font-medium">₹{q.price.toFixed(2)}</p>
              <Delta value={q.changePct} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
