"""
Universe Manager — SQLite Storage & Fast Full-Text Search Engine
Manages the complete 2,000+ NSE/BSE listed equity universe, priority tiers,
and provides lightning-fast search autocomplete for the UI and backend.
"""

import os
import sqlite3
import re
from typing import Dict, Any, List, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "universe.db")


def get_connection() -> sqlite3.Connection:
    """Creates a connection to the SQLite database with thread-safe settings."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes tables and Full-Text Search (FTS5) virtual indices."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Main Tickers Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tickers (
                symbol TEXT PRIMARY KEY,
                exchange TEXT DEFAULT 'NSE',
                company_name TEXT,
                isin TEXT,
                sector TEXT DEFAULT 'Equities',
                industry TEXT DEFAULT 'General',
                listing_date TEXT,
                tier INTEGER DEFAULT 2,
                is_active INTEGER DEFAULT 1,
                last_price REAL,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 2. Virtual Table for Full-Text Search (FTS5)
        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS universe_fts USING fts5(
                symbol,
                company_name,
                sector,
                industry,
                content='tickers',
                content_rowid='rowid'
            )
        """)

        # Triggers to keep FTS index synchronized with tickers table
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS tickers_ai AFTER INSERT ON tickers BEGIN
                INSERT INTO universe_fts(rowid, symbol, company_name, sector, industry)
                VALUES (new.rowid, new.symbol, new.company_name, new.sector, new.industry);
            END;
        """)

        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS tickers_ad AFTER DELETE ON tickers BEGIN
                INSERT INTO universe_fts(universe_fts, rowid, symbol, company_name, sector, industry)
                VALUES('delete', old.rowid, old.symbol, old.company_name, old.sector, old.industry);
            END;
        """)

        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS tickers_au AFTER UPDATE ON tickers BEGIN
                INSERT INTO universe_fts(universe_fts, rowid, symbol, company_name, sector, industry)
                VALUES('delete', old.rowid, old.symbol, old.company_name, old.sector, old.industry);
                INSERT INTO universe_fts(rowid, symbol, company_name, sector, industry)
                VALUES (new.rowid, new.symbol, new.company_name, new.sector, new.industry);
            END;
        """)

        # 3. Backfill Status Tracking Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS backfill_jobs (
                symbol TEXT PRIMARY KEY,
                status TEXT DEFAULT 'PENDING',
                start_date TEXT,
                end_date TEXT,
                rows_ingested INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()


def upsert_ticker(
    symbol: str,
    company_name: str,
    exchange: str = "NSE",
    isin: str = "",
    sector: str = "Equities",
    industry: str = "General",
    listing_date: str = "",
    tier: int = 2,
    is_active: int = 1,
    last_price: Optional[float] = None
) -> bool:
    """Inserts or updates a single ticker in the universe."""
    clean_sym = symbol.strip().upper()
    if not clean_sym:
        return False

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO tickers (symbol, exchange, company_name, isin, sector, industry, listing_date, tier, is_active, last_price, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(symbol) DO UPDATE SET
                company_name = excluded.company_name,
                exchange = excluded.exchange,
                isin = COALESCE(NULLIF(excluded.isin, ''), tickers.isin),
                sector = COALESCE(NULLIF(excluded.sector, ''), tickers.sector),
                industry = COALESCE(NULLIF(excluded.industry, ''), tickers.industry),
                tier = excluded.tier,
                is_active = excluded.is_active,
                last_price = COALESCE(excluded.last_price, tickers.last_price),
                last_updated = CURRENT_TIMESTAMP
        """, (clean_sym, exchange, company_name, isin, sector, industry, listing_date, tier, is_active, last_price))
        conn.commit()
    return True


def bulk_upsert_tickers(tickers_data: List[Dict[str, Any]]) -> int:
    """Bulk inserts or updates a list of tickers in a single transaction."""
    if not tickers_data:
        return 0

    with get_connection() as conn:
        cursor = conn.cursor()
        count = 0
        for t in tickers_data:
            sym = t.get("symbol", "").strip().upper()
            if not sym:
                continue
            name = t.get("company_name", sym)
            exch = t.get("exchange", "NSE")
            isin = t.get("isin", "")
            sec = t.get("sector", "Equities")
            ind = t.get("industry", "General")
            l_date = t.get("listing_date", "")
            tier = t.get("tier", 2)
            active = t.get("is_active", 1)
            lp = t.get("last_price")

            cursor.execute("""
                INSERT INTO tickers (symbol, exchange, company_name, isin, sector, industry, listing_date, tier, is_active, last_price, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(symbol) DO UPDATE SET
                    company_name = excluded.company_name,
                    exchange = excluded.exchange,
                    isin = COALESCE(NULLIF(excluded.isin, ''), tickers.isin),
                    sector = COALESCE(NULLIF(excluded.sector, ''), tickers.sector),
                    industry = COALESCE(NULLIF(excluded.industry, ''), tickers.industry),
                    tier = excluded.tier,
                    is_active = excluded.is_active,
                    last_price = COALESCE(excluded.last_price, tickers.last_price),
                    last_updated = CURRENT_TIMESTAMP
            """, (sym, exch, name, isin, sec, ind, l_date, tier, active, lp))
            count += 1

        conn.commit()
        return count


def update_last_price(symbol: str, price: float) -> bool:
    """Updates the cached last traded price for a ticker."""
    clean_sym = symbol.strip().upper()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE tickers SET last_price = ?, last_updated = CURRENT_TIMESTAMP WHERE symbol = ?", (price, clean_sym))
        conn.commit()
        return cursor.rowcount > 0


def search_tickers(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    """
    Blazing fast autocomplete search using SQLite FTS5 full-text matching + prefix fallback.
    Returns sorted list matching ticker symbol, company name, or sector.
    """
    if not query or not query.strip():
        return []

    clean_q = query.strip().upper()
    results = []
    seen_symbols = set()

    with get_connection() as conn:
        cursor = conn.cursor()

        # Phase 1: Exact or prefix symbol match
        cursor.execute("""
            SELECT symbol, exchange, company_name, isin, sector, industry, tier, last_price
            FROM tickers
            WHERE is_active = 1 AND (symbol = ? OR symbol LIKE ? OR company_name LIKE ?)
            ORDER BY 
                CASE WHEN symbol = ? THEN 1
                     WHEN symbol LIKE ? THEN 2
                     ELSE 3 END,
                tier ASC,
                symbol ASC
            LIMIT ?
        """, (clean_q, f"{clean_q}%", f"{clean_q}%", clean_q, f"{clean_q}%", limit))

        for row in cursor.fetchall():
            s = row["symbol"]
            if s not in seen_symbols:
                seen_symbols.add(s)
                results.append(dict(row))

        # Phase 2: If we still need more matches, use FTS5 full-text search
        if len(results) < limit:
            safe_fts = re.sub(r"[^a-zA-Z0-9\s]", "", query).strip()
            if safe_fts:
                try:
                    cursor.execute("""
                        SELECT t.symbol, t.exchange, t.company_name, t.isin, t.sector, t.industry, t.tier, t.last_price
                        FROM universe_fts f
                        JOIN tickers t ON f.rowid = t.rowid
                        WHERE universe_fts MATCH ? AND t.is_active = 1
                        ORDER BY t.tier ASC
                        LIMIT ?
                    """, (f"{safe_fts}*", limit - len(results)))
                    for row in cursor.fetchall():
                        s = row["symbol"]
                        if s not in seen_symbols:
                            seen_symbols.add(s)
                            results.append(dict(row))
                except Exception:
                    pass

    return results[:limit]


def get_ticker(symbol: str) -> Optional[Dict[str, Any]]:
    """Retrieves ticker profile from the database."""
    clean_sym = symbol.strip().upper()
    base_sym = clean_sym.replace(".NS", "").replace(".BO", "")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tickers WHERE symbol = ? OR symbol = ?", (clean_sym, base_sym))
        row = cursor.fetchone()
        if row:
            return dict(row)
    return None


def get_all_tickers(tier: Optional[int] = None, active_only: bool = True, limit: int = 3000) -> List[Dict[str, Any]]:
    """Retrieves all tickers, optionally filtered by tier (1 = Nifty 500, 2 = Broader universe)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        query = "SELECT symbol, exchange, company_name, isin, sector, industry, tier, last_price FROM tickers WHERE 1=1"
        params = []
        if active_only:
            query += " AND is_active = 1"
        if tier is not None:
            query += " AND tier = ?"
            params.append(tier)
        query += " ORDER BY tier ASC, symbol ASC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]


def get_universe_stats() -> Dict[str, Any]:
    """Returns total count of companies, tiers, sectors, and backfill progress."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total FROM tickers WHERE is_active = 1")
        total = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as t1 FROM tickers WHERE tier = 1 AND is_active = 1")
        t1 = cursor.fetchone()["t1"]

        cursor.execute("SELECT COUNT(DISTINCT sector) as sectors FROM tickers WHERE is_active = 1")
        sectors = cursor.fetchone()["sectors"]

        cursor.execute("SELECT COUNT(*) as backfilled FROM backfill_jobs WHERE status = 'COMPLETED'")
        backfilled = cursor.fetchone()["backfilled"]

        return {
            "total_companies": total,
            "tier_1_nifty500": t1,
            "tier_2_broad": total - t1,
            "sectors_tracked": sectors,
            "backfilled_history_count": backfilled
        }


# Aliases
init_universe_db = init_db
upsert_tickers = bulk_upsert_tickers

# Auto-initialize on import
init_db()
