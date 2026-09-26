"""
Hybrid Machine Learning Pipeline Orchestrator
Integrates Data Loading, Indicator Engineering, Model Fitting, Multi-Horizon Inference,
and JSON Serialization for Web Dashboard.
"""

import time
import pandas as pd
import numpy as np
from typing import Dict, Any
from .feature_engineering import fetch_and_prepare_features
from .models import HybridStockPredictor
from .evaluator import evaluate_predictions, simulate_trading_strategy, generate_tactical_trade_setup, generate_monte_carlo_forecasts

# Cache to store trained pipelines (5-minute TTL)
PIPELINE_CACHE = {}

FEATURE_COLUMNS = [
    'SMA_10', 'SMA_20', 'SMA_50', 'EMA_12', 'EMA_26', 'EMA_50',
    'MACD_Line', 'MACD_Signal', 'MACD_Hist',
    'Dist_EMA_20', 'Dist_EMA_50', 'Dist_VWAP',
    'RSI_14', 'StochRSI_K', 'StochRSI_D', 'Stoch_K', 'Stoch_D', 'Williams_R',
    'ROC_5', 'ROC_10', 'CCI_20',
    'BB_Width', 'BB_PctB', 'ATR_Pct', 'Hist_Vol_5', 'Hist_Vol_10', 'Hist_Vol_20',
    'Squeeze_On', 'Vol_Ratio', 'CMF_20', 'MFI_14',
    'High_Low_Spread', 'Close_Open_Spread',
    'Ret_Lag1', 'Ret_Lag2', 'Ret_Lag3', 'Ret_Lag5', 'Ret_Lag10'
]

def run_hybrid_stock_prediction(ticker: str = "RELIANCE", period: str = "2y", force_retrain: bool = False) -> Dict[str, Any]:
    """
    Executes the full end-to-end Hybrid Machine Learning Stock Prediction workflow.
    """
    cache_key = f"{ticker.upper()}_{period}"
    now = time.time()
    
    if not force_retrain and cache_key in PIPELINE_CACHE:
        entry = PIPELINE_CACHE[cache_key]
        if now - entry["timestamp"] < 300: # 5 min TTL
            return entry["data"]

    # 1. Ingestion & Feature Engineering
    feature_df, meta = fetch_and_prepare_features(ticker, period=period)
    
    # Verify feature columns exist
    valid_features = [c for c in FEATURE_COLUMNS if c in feature_df.columns]
    
    # 2. Fit Hybrid Model (Tree + BiLSTM)
    model = HybridStockPredictor(seq_length=20)
    model.fit(feature_df, feature_cols=valid_features, target_col="Target_Ret_1D", epochs=12)
    
    # 3. Predict Next Day
    hybrid_ret, tree_ret, nn_ret = model.predict_next(feature_df, valid_features)
    
    # 4. Generate Backtest Series
    backtest_df = model.generate_backtest_predictions(feature_df, valid_features, target_col="Target_Ret_1D")
    
    # Evaluation Metrics on Test Segment (Last 20% of data)
    test_split = int(len(backtest_df) * 0.8)
    test_segment = backtest_df.iloc[test_split:].copy()
    
    eval_metrics = evaluate_predictions(
        actual_returns=test_segment['Target_Ret_1D'].values,
        pred_returns=test_segment['Pred_Hybrid_Ret'].values,
        actual_prices=test_segment['Close'].values,
        pred_prices=test_segment['Pred_Close'].values
    )
    
    # Strategy Backtesting
    backtest_metrics = simulate_trading_strategy(backtest_df)
    
    # 5. Tactical Trade Setup
    current_price = meta["last_close"]
    atr_val = float(feature_df['ATR_14'].iloc[-1]) if 'ATR_14' in feature_df.columns else current_price * 0.015
    rsi_val = meta["last_rsi"]
    vol_val = float(feature_df['Hist_Vol_20'].iloc[-1]) if 'Hist_Vol_20' in feature_df.columns else 22.0
    
    trade_setup = generate_tactical_trade_setup(
        current_price=current_price,
        predicted_return_pct=hybrid_ret,
        atr=atr_val,
        rsi=rsi_val,
        tree_weight=model.weights["tree"],
        nn_weight=model.weights["neural"]
    )
    
    # 6. Monte Carlo Stochastic 10-Day Forward Forecast
    monte_carlo = generate_monte_carlo_forecasts(
        current_price=current_price,
        daily_volatility_pct=vol_val,
        expected_daily_ret_pct=hybrid_ret,
        num_days=10,
        num_simulations=40
    )
    
    # 7. Chart Series Preparation (Last 60 trading days + 1 forward prediction day)
    chart_window = backtest_df.tail(60).copy()
    
    dates = [idx.strftime("%d %b") for idx in chart_window.index]
    actual_prices = [round(float(v), 2) for v in chart_window['Close']]
    pred_prices = [round(float(v), 2) for v in chart_window['Pred_Close']]
    
    # Add next trading day forward point
    next_date_str = "Tomorrow (ML Forecast)"
    dates.append(next_date_str)
    actual_prices.append(None) # Not yet realized
    pred_prices.append(trade_setup["predicted_price"])
    
    # Multi-Horizon Targets
    pred_3d_price = round(current_price * (1 + (hybrid_ret * 1.8) / 100), 2)
    pred_5d_price = round(current_price * (1 + (hybrid_ret * 2.6) / 100), 2)
    
    trade_setup["target_1d"] = trade_setup["predicted_price"]
    trade_setup["target_3d"] = pred_3d_price
    trade_setup["target_5d"] = pred_5d_price

    # Output Payload
    result = {
        "status": "success",
        "meta": meta,
        "trade_setup": trade_setup,
        "multi_horizon_targets": {
            "target_1d": trade_setup["predicted_price"],
            "expected_1d_pct": round(hybrid_ret, 2),
            "target_3d": pred_3d_price,
            "expected_3d_pct": round(hybrid_ret * 1.8, 2),
            "target_5d": pred_5d_price,
            "expected_5d_pct": round(hybrid_ret * 2.6, 2),
        },
        "monte_carlo": monte_carlo,
        "monte_carlo_forecast": monte_carlo,
        "model_composition": {
            "tree_model_name": "Gradient Boosted Decision Forest",
            "tree_weight_pct": round(model.weights["tree"] * 100, 1),
            "tree_predicted_ret_pct": round(tree_ret, 2),
            "neural_model_name": "PyTorch BiLSTM Sequential Network (Attention)",
            "neural_weight_pct": round(model.weights["neural"] * 100, 1),
            "neural_predicted_ret_pct": round(nn_ret, 2),
            "hybrid_fused_ret_pct": round(hybrid_ret, 2),
        },
        "evaluation_metrics": eval_metrics,
        "backtest_metrics": backtest_metrics,
        "feature_importances": model.feature_importances,
        "chart_data": {
            "dates": dates,
            "actual_prices": actual_prices,
            "predicted_prices": pred_prices,
        },
        "computed_at": time.strftime("%Y-%m-%d %H:%M:%S IST")
    }
    
    PIPELINE_CACHE[cache_key] = {"timestamp": now, "data": result}
    return result
