# 🚀 Pratap Trading Agent 2.0 — Max Market Institutional Quant & AI Platform

[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-blue?logo=python)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-Deep%20Learning-EE4C2C?logo=pytorch)](https://pytorch.org/)
[![React](https://img.shields.io/badge/React%2018-Vite%20%2B%20Tailwind-61DAFB?logo=react)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Autonomous Multi-Asset Quant Terminal, Dual-Model Hybrid ML Engine, Auto-Scaling Company Universe, and Grounded Multi-Language AI Copilot.**

---

## 🌟 Key Architecture & Capabilities

### 1. 🧠 Dual-Model Hybrid Machine Learning (`hybrid_ml/`)
- **Model A: Gradient Boosted Decision Trees (GBDT)**: Learns complex non-linear interactions across 38 quantitative indicators.
- **Model B: PyTorch Sequential BiLSTM with Temporal Attention**: Captures multi-day price momentum and sequential market memory.
- **Inverse-Variance Stacking Meta-Learner**: Combines tree-based tabular predictions with sequential deep learning based on model uncertainty.
- **Monte Carlo Stochastic Engine**: 10-day forward price path simulations with dynamic volatility cones.

### 2. 🛡️ Marcos Lopez de Prado Validation Gate & Model Registry (`auto_train/`)
- **Purged 5-Fold Cross-Validation with 1% Embargo**: Eliminates lookahead bias and serial correlation.
- **Strict Out-of-Sample Gate**: Evaluates candidate models against live production benchmarks on directional **Hit Rate (+0.5% boost required)**, **Sortino Ratio**, and **Max Drawdown**.
- **Atomic Zero-Downtime Hot-Swapping**: Serves model weights referenced by `models/current.json` without process restarts.
- **One-Click Instant Rollback**: Reverts to prior champion models instantly via API or CLI.

### 3. 🌐 Auto-Scaling Company Universe (`universe/`)
- **Official NSE/BSE Archives Ingestion**: Auto-indexes **2,586+ listed equities** with zero manual hardcoding.
- **Priority Tiering**: Tier 1 (501 Nifty 500 constituents) + Tier 2 (2,085 broader market equities).
- **SQLite FTS5 Full-Text Search**: Sub-20ms autocomplete search across tickers, company names, and sectors.
- **Corporate Action & Rename Mapping**: Automatically handles rebrands (e.g. Zomato $	o$ `ETERNAL.NS`).

### 4. 🤖 12 Grounded Individual AI Copilot Blocks (`ai_copilot.py`)
- Individual explainer blocks embedded into every single terminal and stock analysis section:
  - Technicals, ML Predictions, Tactical Setup, Monte Carlo, Fundamentals, Valuation (DCF), News & Sentiment, Screener, Watchlist, Portfolio, Risk Management.
- Grounded in quantitative literature: *John J. Murphy, Steve Nison, Marcos Lopez de Prado, Nassim Nicholas Taleb, Alexander Elder, Benjamin Graham & David Dodd*.
- **Multi-Language Support**: English & Telugu-English.

### 5. 💻 Institutional UI & 3D Visualizers (`frontend/`)
- **3D Market Globe**: WebGL particle holographic globe rendering live global market sentiment.
- **3D Universe Galaxy**: Interactive 3D constellation map of all stock sectors and market-cap clusters.
- **Quant Terminal**: Full trading suite with Portfolio Manager, Order Execution, Watchlists, Technical Scorecards, and Live Charts.

---

## 📂 Codebase Structure

```
pratap-trading-agent-2.0/
├── app.py                            # Production Multi-Threaded Waitress WSGI Server
├── ai_copilot.py                     # 12 Grounded Individual AI Copilot Explainers
├── ai_engine.py                      # Groq Llama 3.3 70B Multi-Agent Assistant
├── stock_data.py                     # Yahoo Finance real-time data & screener pipeline
│
├── hybrid_ml/                        # QUANT MACHINE LEARNING ENGINE
│   ├── models.py                     # GBDT + PyTorch BiLSTM Attention + Inverse-Variance Meta-Learner
│   ├── feature_engineering.py        # 38 Quantitative & Momentum Feature Indicators
│   └── evaluator.py                  # Sortino, Max Drawdown & Monte Carlo Simulations
│
├── universe/                         # AUTO-SCALING COMPANY UNIVERSE
│   ├── universe_manager.py           # SQLite FTS5 Search & Tier Engine (data/universe.db)
│   └── nse_bse_scraper.py            # Live NSE/BSE Equity Discovery Ingestion
│
├── auto_train/                       # AUTO-TRAINING & VALIDATION GATE
│   ├── validation_gate.py            # Marcos Lopez de Prado Purged 5-Fold Cross-Validation
│   ├── model_registry.py             # Atomic Registry & One-Click Rollback
│   └── trainer_job.py                # End-to-End Retraining & Promotion Pipeline
│
├── frontend/                         # MODERN REACT + VITE + TAILWIND FRONTEND
│   ├── src/routes/
│   │   ├── index.tsx                 # Main Dashboard + 3D Market Globe
│   │   ├── terminal.tsx              # Institutional Quant Terminal Suite
│   │   ├── galaxy.tsx                # 3D Sector Constellation Galaxy
│   │   └── stock.$symbol.tsx         # Deep-Dive Candlestick Charts & AI Blocks
│   └── src/components/copilot/       # Individual AI Copilot Blocks
│
├── models/
│   ├── current.json                  # Active Production Model Metadata
│   └── history.json                  # Model Promotion & Rejection Audit Log
│
└── .github/workflows/
    └── auto_train_schedule.yml       # Free-Tier Weekly Retraining Workflow
```

---

## ⚡ Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/suryaramisetty70-pyt/pratap-trading-agent-2.0.git
cd pratap-trading-agent-2.0

# Install Python backend dependencies
pip install -r requirements.txt
```

### 2. Set Up Environment Variables (Optional for LLM features)
Create a `.env` file:
```env
GROQ_API_KEY=your_groq_api_key_here
PORT=8080
```

### 3. Run the Platform
```bash
python app.py
```
Open **`http://localhost:8080`** in your browser.

---

## 📡 REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/universe/search?q={query}` | `GET` | Sub-20ms FTS5 full-text search across 2,586+ companies |
| `/api/universe/stats` | `GET` | Counts of total listed companies, Tier 1/2, and sectors |
| `/api/stock-data?ticker={sym}` | `GET` | Live OHLCV prices, technical indicators & scorecards |
| `/api/market-screener` | `GET` | Real-time momentum, breakout, and oversold screener |
| `/api/copilot/explain` | `POST` | Generates section-specific AI quant explanations |
| `/api/models/status` | `GET` | Active production model metadata & cross-validation scores |
| `/api/models/retrain` | `POST` | Triggers auto-training through Lopez de Prado Validation Gate |
| `/api/models/rollback` | `POST` | One-click atomic rollback to previous stable model |

---

## 📜 License
MIT License. Built for High-Performance Quantitative Trading & AI Market Intelligence.
