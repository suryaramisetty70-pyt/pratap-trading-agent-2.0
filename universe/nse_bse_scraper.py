"""
Surya AI Trading Agent - NSE & BSE Auto-Discovery Scraper
Fetches official equity symbols directly from National Stock Exchange (NSE)
and Bombay Stock Exchange (BSE) archives and indexes them into SQLite Universe DB.
"""

import os
import sys
import json
import csv
import io
import time
import logging
import urllib.request
from typing import Dict, List, Any, Optional, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nse_bse_scraper")

NSE_EQUITY_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
NIFTY500_URL = "https://archives.nseindia.com/content/indices/ind_nifty500list.csv"

# Known corporate rebrandings / symbol changes on Indian exchanges
KNOWN_REBRANDINGS = {
    "ZOMATO": "ETERNAL",
    "CADILAHC": "ZYDUSLIFE",
    "LTI": "LTIM",
    "MINDTREE": "LTIM",
    "TATAMTRDVR": "TATAMOTORS",
    "MOTHERSUMI": "MOTHERSON",
    "STRTECH": "STLTECH",
    "HEXAWARE": "HEXAWARE",
    "RCOM": "RCOM",
    "DHFL": "DHFL"
}

# Sector mappings for common Indian industries
SECTOR_MAP = {
    "Financial Services": "Financials",
    "Information Technology": "Technology",
    "Automobile and Auto Components": "Automotive",
    "Oil Gas & Consumable Fuels": "Energy",
    "Fast Moving Consumer Goods": "Consumer Goods",
    "Healthcare": "Healthcare",
    "Consumer Durables": "Consumer Goods",
    "Metals & Mining": "Basic Materials",
    "Construction Materials": "Industrials",
    "Telecommunication": "Telecommunications",
    "Power": "Utilities",
    "Chemicals": "Basic Materials",
    "Services": "Services",
    "Capital Goods": "Industrials",
    "Realty": "Real Estate",
    "Media Oil & Gas": "Energy",
    "Textiles": "Consumer Goods",
    "Consumer Services": "Services"
}

# Core fallback seed list (in case network is completely unreachable)
FALLBACK_SEEDS = [
    {"symbol": "RELIANCE", "company_name": "Reliance Industries Limited", "isin": "INE002A01018", "sector": "Energy", "industry": "Oil & Gas", "tier": 1},
    {"symbol": "TCS", "company_name": "Tata Consultancy Services Limited", "isin": "INE467B01029", "sector": "Technology", "industry": "IT Services", "tier": 1},
    {"symbol": "HDFCBANK", "company_name": "HDFC Bank Limited", "isin": "INE040A01034", "sector": "Financials", "industry": "Private Bank", "tier": 1},
    {"symbol": "INFY", "company_name": "Infosys Limited", "isin": "INE009A01021", "sector": "Technology", "industry": "IT Services", "tier": 1},
    {"symbol": "ICICIBANK", "company_name": "ICICI Bank Limited", "isin": "INE090A01021", "sector": "Financials", "industry": "Private Bank", "tier": 1},
    {"symbol": "HINDUNILVR", "company_name": "Hindustan Unilever Limited", "isin": "INE030A01027", "sector": "Consumer Goods", "industry": "FMCG", "tier": 1},
    {"symbol": "ITC", "company_name": "ITC Limited", "isin": "INE154A01025", "sector": "Consumer Goods", "industry": "Tobacco & FMCG", "tier": 1},
    {"symbol": "SBIN", "company_name": "State Bank of India", "isin": "INE062A01020", "sector": "Financials", "industry": "Public Bank", "tier": 1},
    {"symbol": "BHARTIARTL", "company_name": "Bharti Airtel Limited", "isin": "INE397D01024", "sector": "Telecommunications", "industry": "Telecom Services", "tier": 1},
    {"symbol": "LICI", "company_name": "Life Insurance Corporation Of India", "isin": "INE115A01026", "sector": "Financials", "industry": "Life Insurance", "tier": 1},
    {"symbol": "TATAMOTORS", "company_name": "Tata Motors Limited", "isin": "INE155A01022", "sector": "Automotive", "industry": "Automobiles", "tier": 1},
    {"symbol": "ETERNAL", "company_name": "Eternal Limited (formerly Zomato)", "isin": "INE758T01015", "sector": "Technology", "industry": "E-Commerce / Food Delivery", "tier": 1},
    {"symbol": "KOTAKBANK", "company_name": "Kotak Mahindra Bank Limited", "isin": "INE237A01028", "sector": "Financials", "industry": "Private Bank", "tier": 1},
    {"symbol": "LT", "company_name": "Larsen & Toubro Limited", "isin": "INE018A01030", "sector": "Industrials", "industry": "Engineering & Construction", "tier": 1},
    {"symbol": "AXISBANK", "company_name": "Axis Bank Limited", "isin": "INE238A01034", "sector": "Financials", "industry": "Private Bank", "tier": 1},
    {"symbol": "ASIANPAINT", "company_name": "Asian Paints Limited", "isin": "INE021A01026", "sector": "Consumer Goods", "industry": "Paints", "tier": 1},
    {"symbol": "MARUTI", "company_name": "Maruti Suzuki India Limited", "isin": "INE585B01010", "sector": "Automotive", "industry": "Automobiles", "tier": 1},
    {"symbol": "SUNPHARMA", "company_name": "Sun Pharmaceutical Industries Limited", "isin": "INE044A01036", "sector": "Healthcare", "industry": "Pharmaceuticals", "tier": 1},
    {"symbol": "BAJFINANCE", "company_name": "Bajaj Finance Limited", "isin": "INE296A01024", "sector": "Financials", "industry": "NBFC", "tier": 1},
    {"symbol": "TITAN", "company_name": "Titan Company Limited", "isin": "INE280A01028", "sector": "Consumer Goods", "industry": "Jewellery & Watches", "tier": 1},
    {"symbol": "ADANIENT", "company_name": "Adani Enterprises Limited", "isin": "INE423A01024", "sector": "Industrials", "industry": "Metals & Trading", "tier": 1},
    {"symbol": "ADANIPORTS", "company_name": "Adani Ports and Special Economic Zone Limited", "isin": "INE742F01042", "sector": "Industrials", "industry": "Port Operations", "tier": 1},
    {"symbol": "WIPRO", "company_name": "Wipro Limited", "isin": "INE075A01022", "sector": "Technology", "industry": "IT Services", "tier": 1},
    {"symbol": "HCLTECH", "company_name": "HCL Technologies Limited", "isin": "INE860A01027", "sector": "Technology", "industry": "IT Services", "tier": 1},
    {"symbol": "NTPC", "company_name": "NTPC Limited", "isin": "INE733E01010", "sector": "Utilities", "industry": "Power Generation", "tier": 1},
    {"symbol": "POWERGRID", "company_name": "Power Grid Corporation of India Limited", "isin": "INE752E01010", "sector": "Utilities", "industry": "Power Transmission", "tier": 1},
    {"symbol": "ULTRACEMCO", "company_name": "UltraTech Cement Limited", "isin": "INE481G01011", "sector": "Industrials", "industry": "Cement", "tier": 1},
    {"symbol": "ONGC", "company_name": "Oil & Natural Gas Corporation Limited", "isin": "INE213A01029", "sector": "Energy", "industry": "Oil Exploration", "tier": 1},
    {"symbol": "COALINDIA", "company_name": "Coal India Limited", "isin": "INE522F01014", "sector": "Energy", "industry": "Coal Mining", "tier": 1},
    {"symbol": "BAJAJFINSV", "company_name": "Bajaj Finserv Limited", "isin": "INE918I01018", "sector": "Financials", "industry": "Holding Company", "tier": 1}
]

def _http_get(url: str, timeout: int = 15) -> Optional[str]:
    """Helper to download text content with browser headers."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read().decode("utf-8", errors="replace")
    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None


def fetch_nifty500() -> Dict[str, Dict[str, Any]]:
    """Fetches the Nifty 500 constituents with Industry and ISIN."""
    logger.info("Fetching Nifty 500 list from NSE archives...")
    data = _http_get(NIFTY500_URL)
    nifty_map = {}
    if not data:
        logger.warning("Could not fetch live Nifty 500 CSV, using fallback data.")
        return nifty_map

    try:
        reader = csv.DictReader(io.StringIO(data))
        for row in reader:
            clean_row = {k.strip(): v.strip() for k, v in row.items() if k and v}
            sym = clean_row.get("Symbol", "").upper()
            if not sym:
                continue
            
            industry = clean_row.get("Industry", "")
            sector = SECTOR_MAP.get(industry, "Other")
            nifty_map[sym] = {
                "company_name": clean_row.get("Company Name", sym),
                "isin": clean_row.get("ISIN Code", ""),
                "industry": industry,
                "sector": sector,
                "tier": 1
            }
        logger.info(f"Loaded {len(nifty_map)} Nifty 500 constituents.")
    except Exception as e:
        logger.error(f"Error parsing Nifty 500 CSV: {e}")
    
    return nifty_map


def fetch_all_nse_equities() -> List[Dict[str, Any]]:
    """Fetches all equity instruments listed on NSE."""
    logger.info("Fetching complete equity list from NSE archives...")
    data = _http_get(NSE_EQUITY_URL)
    equities = []
    if not data:
        logger.warning("Could not fetch live NSE equity CSV, using embedded seeds.")
        return equities

    try:
        reader = csv.DictReader(io.StringIO(data))
        for row in reader:
            clean_row = {k.strip(): v.strip() for k, v in row.items() if k and v}
            sym = clean_row.get("SYMBOL", "").upper()
            series = clean_row.get("SERIES", "").upper()
            
            # Filter for active equity series
            if not sym or series not in ("EQ", "BE", "SM", "BZ"):
                continue
                
            equities.append({
                "symbol": sym,
                "company_name": clean_row.get("NAME OF COMPANY", sym),
                "isin": clean_row.get("ISIN NUMBER", ""),
                "listing_date": clean_row.get("DATE OF LISTING", "")
            })
        logger.info(f"Loaded {len(equities)} total listed NSE equities.")
    except Exception as e:
        logger.error(f"Error parsing NSE equity CSV: {e}")
        
    return equities


def sync_universe(force_refresh: bool = False) -> Dict[str, Any]:
    """
    Main ingestion routine.
    Fetches full NSE list & Nifty 500 index, computes tiers, handles renames,
    and bulk-upserts into SQLite `universe.db`.
    """
    start_time = time.time()
    logger.info("Starting Full Universe Sync...")

    # Ensure parent project root is in path
    proj_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if proj_root not in sys.path:
        sys.path.insert(0, proj_root)

    from universe.universe_manager import init_universe_db, upsert_tickers, get_universe_stats

    # Ensure DB schema is ready
    init_universe_db()

    # 1. Fetch Nifty 500
    nifty500 = fetch_nifty500()

    # 2. Fetch All NSE Equities
    nse_all = fetch_all_nse_equities()

    tickers_to_save: List[Dict[str, Any]] = []
    seen_symbols = set()

    # If both downloads failed, use fallback seeds
    if not nifty500 and not nse_all:
        logger.warning("Network unavailable. Populating universe with core fallback seeds.")
        for item in FALLBACK_SEEDS:
            tickers_to_save.append({
                "symbol": item["symbol"],
                "exchange": "NSE",
                "company_name": item["company_name"],
                "isin": item["isin"],
                "sector": item["sector"],
                "industry": item["industry"],
                "tier": item["tier"],
                "is_active": 1
            })
    else:
        # Process Nifty 500 first (Tier 1)
        for sym, meta in nifty500.items():
            seen_symbols.add(sym)
            tickers_to_save.append({
                "symbol": sym,
                "exchange": "NSE",
                "company_name": meta["company_name"],
                "isin": meta["isin"],
                "sector": meta["sector"],
                "industry": meta["industry"],
                "tier": 1,
                "is_active": 1
            })

        # Process rest of NSE equities (Tier 2 if not in Nifty 500)
        for item in nse_all:
            sym = item["symbol"]
            if sym in seen_symbols:
                continue
            seen_symbols.add(sym)
            
            tickers_to_save.append({
                "symbol": sym,
                "exchange": "NSE",
                "company_name": item["company_name"],
                "isin": item["isin"],
                "sector": "Other",
                "industry": "General Equity",
                "tier": 2,
                "is_active": 1
            })

    # 3. Bulk upsert into database
    upserted_count = upsert_tickers(tickers_to_save)
    elapsed = round(time.time() - start_time, 2)
    stats = get_universe_stats()

    logger.info(f"Universe Sync Finished in {elapsed}s. Upserted: {upserted_count} tickers. Total in DB: {stats.get('total_tickers')}")

    return {
        "status": "success",
        "elapsed_seconds": elapsed,
        "upserted_count": upserted_count,
        "total_tickers": stats.get("total_tickers", 0),
        "tier1_count": stats.get("tier1_count", 0),
        "tier2_count": stats.get("tier2_count", 0),
        "stats": stats
    }


if __name__ == "__main__":
    result = sync_universe(force_refresh=True)
    print(json.dumps(result, indent=2))
