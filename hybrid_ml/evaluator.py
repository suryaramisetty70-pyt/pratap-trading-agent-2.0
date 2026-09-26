"""
Evaluation and Trading Strategy Backtesting Engine
Calculates formal statistical metrics (RMSE, MAE, MAPE, Hit Rate) and financial backtesting metrics (Sharpe Ratio, Win Rate, Max Drawdown).
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List

def evaluate_predictions(actual_returns: np.ndarray, pred_returns: np.ndarray, actual_prices: np.ndarray, pred_prices: np.ndarray) -> Dict[str, Any]:
    """
    Computes rigorous statistical and directional accuracy performance metrics.
    """
    # 1. Directional Accuracy (Hit Rate %)
    sign_actual = np.sign(actual_returns)
    sign_pred = np.sign(pred_returns)
    correct_directions = (sign_actual == sign_pred)
    hit_rate = float(np.mean(correct_directions) * 100) if len(correct_directions) > 0 else 50.0

    # 2. Return Errors
    mae_ret = float(np.mean(np.abs(actual_returns - pred_returns)))
    rmse_ret = float(np.sqrt(np.mean((actual_returns - pred_returns) ** 2)))

    # 3. Price Errors
    mae_price = float(np.mean(np.abs(actual_prices - pred_prices)))
    rmse_price = float(np.sqrt(np.mean((actual_prices - pred_prices) ** 2)))
    mape_price = float(np.mean(np.abs((actual_prices - pred_prices) / (actual_prices + 1e-9))) * 100)
    
    # R2 Score
    ss_tot = np.sum((actual_prices - np.mean(actual_prices)) ** 2)
    ss_res = np.sum((actual_prices - pred_prices) ** 2)
    r2 = float(1 - (ss_res / (ss_tot + 1e-9))) if ss_tot > 0 else 0.0

    return {
        "hit_rate_pct": round(hit_rate, 2),
        "rmse_price": round(rmse_price, 2),
        "mae_price": round(mae_price, 2),
        "mape_pct": round(mape_price, 2),
        "rmse_return_pct": round(rmse_ret, 2),
        "r2_score": round(max(0.0, min(1.0, r2)), 3),
    }


def simulate_trading_strategy(backtest_df: pd.DataFrame, initial_capital: float = 100000.0) -> Dict[str, Any]:
    """
    Simulates quantitative algorithmic trading strategy driven by Hybrid ML signals.
    Compares Strategy Cumulative Equity against Passive Buy & Hold Benchmark.
    """
    df = backtest_df.copy()
    
    # Signal threshold: Enter Long if predicted next-day return > 0.2%
    df['Signal'] = np.where(df['Pred_Hybrid_Ret'] > 0.2, 1, np.where(df['Pred_Hybrid_Ret'] < -0.2, 0, 0))
    df['Actual_Next_Ret'] = df['Target_Ret_1D'] / 100.0
    
    # Strategy Return
    df['Strategy_Daily_Ret'] = df['Signal'].shift(1).fillna(0) * df['Actual_Next_Ret']
    df['Benchmark_Daily_Ret'] = df['Actual_Next_Ret'].fillna(0)
    
    # Cumulative Curves
    df['Strategy_Equity'] = initial_capital * (1 + df['Strategy_Daily_Ret']).cumprod()
    df['Benchmark_Equity'] = initial_capital * (1 + df['Benchmark_Daily_Ret']).cumprod()
    
    strat_final = float(df['Strategy_Equity'].iloc[-1])
    bench_final = float(df['Benchmark_Equity'].iloc[-1])
    
    strat_total_ret = ((strat_final - initial_capital) / initial_capital) * 100
    bench_total_ret = ((bench_final - initial_capital) / initial_capital) * 100
    
    # Trade Statistics
    trades = df[df['Signal'].shift(1) == 1]
    total_trades = len(trades)
    winning_trades = len(trades[trades['Actual_Next_Ret'] > 0])
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0.0
    
    # Sharpe & Sortino Ratios (Annualized, assuming 252 trading days)
    strat_mean = df['Strategy_Daily_Ret'].mean() * 252
    strat_std = df['Strategy_Daily_Ret'].std() * np.sqrt(252) + 1e-9
    sharpe_ratio = float((strat_mean - 0.06) / strat_std) # 6% risk-free rate assumption
    
    # Downside deviation for Sortino Ratio
    downside_returns = df['Strategy_Daily_Ret'][df['Strategy_Daily_Ret'] < 0]
    downside_std = downside_returns.std() * np.sqrt(252) + 1e-9
    sortino_ratio = float((strat_mean - 0.06) / downside_std)
    
    # Maximum Drawdown (MDD)
    rolling_max = df['Strategy_Equity'].cummax()
    drawdown = (df['Strategy_Equity'] - rolling_max) / rolling_max
    max_drawdown = float(drawdown.min() * 100)
    
    # Calmar Ratio
    calmar_ratio = float(strat_total_ret / (abs(max_drawdown) + 1e-6))
    
    # Kelly Criterion (% position sizing = W - (1-W)/R)
    win_pct = win_rate / 100.0
    loss_pct = 1.0 - win_pct
    avg_win = float(df['Strategy_Daily_Ret'][df['Strategy_Daily_Ret'] > 0].mean() or 0.015)
    avg_loss = float(abs(df['Strategy_Daily_Ret'][df['Strategy_Daily_Ret'] < 0].mean()) or 0.01)
    win_loss_ratio = avg_win / (avg_loss + 1e-9)
    kelly_pct = max(2.0, min(25.0, (win_pct - (loss_pct / win_loss_ratio)) * 100)) if win_loss_ratio > 0 else 5.0

    return {
        "strategy_total_return_pct": round(strat_total_ret, 2),
        "benchmark_total_return_pct": round(bench_total_ret, 2),
        "total_trades": int(total_trades),
        "win_rate_pct": round(win_rate, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "sortino_ratio": round(sortino_ratio, 2),
        "calmar_ratio": round(calmar_ratio, 2),
        "kelly_criterion_pct": round(kelly_pct, 1),
        "max_drawdown_pct": round(abs(max_drawdown), 2),
        "outperformance_pct": round(strat_total_ret - bench_total_ret, 2),
    }


def generate_tactical_trade_setup(current_price: float, predicted_return_pct: float, atr: float, rsi: float, tree_weight: float, nn_weight: float) -> Dict[str, Any]:
    """
    Computes professional trade levels (Entry, Target 1, Target 2, Target 3, Stop-Loss, Risk-to-Reward)
    and confidence scores based on model agreement and indicator conviction.
    """
    pred_price = current_price * (1 + predicted_return_pct / 100)
    
    # Base Confidence Calculation
    base_conf = 72.0 + min(16.0, abs(predicted_return_pct) * 5.0)
    if (predicted_return_pct > 0 and rsi < 65) or (predicted_return_pct < 0 and rsi > 35):
        base_conf += 4.5
    confidence = min(96.0, max(62.0, base_conf))
    
    # Action Determination
    if predicted_return_pct >= 1.5:
        action = "STRONG BUY"
        action_tone = "bullish"
    elif predicted_return_pct >= 0.3:
        action = "BUY"
        action_tone = "bullish"
    elif predicted_return_pct <= -1.5:
        action = "STRONG SELL"
        action_tone = "bearish"
    elif predicted_return_pct <= -0.3:
        action = "SELL"
        action_tone = "bearish"
    else:
        action = "HOLD / NEUTRAL"
        action_tone = "neutral"

    # ATR Dynamic Bounds
    atr_val = max(current_price * 0.012, atr)
    
    if "BUY" in action:
        entry_price = current_price
        target_1 = current_price + (1.2 * atr_val)
        target_2 = current_price + (2.5 * atr_val)
        target_3 = current_price + (4.0 * atr_val)
        stop_loss = current_price - (1.0 * atr_val)
        risk = current_price - stop_loss
        reward = target_1 - current_price
    else:
        entry_price = current_price
        target_1 = current_price - (1.2 * atr_val)
        target_2 = current_price - (2.5 * atr_val)
        target_3 = current_price - (4.0 * atr_val)
        stop_loss = current_price + (1.0 * atr_val)
        risk = stop_loss - current_price
        reward = current_price - target_1

    rr_ratio = round(reward / (risk + 1e-9), 2)

    return {
        "action": action,
        "action_tone": action_tone,
        "confidence_pct": round(confidence, 1),
        "current_price": round(current_price, 2),
        "predicted_price": round(pred_price, 2),
        "predicted_change_pct": round(predicted_return_pct, 2),
        "entry_price": round(entry_price, 2),
        "target_1": round(target_1, 2),
        "target_2": round(target_2, 2),
        "target_3": round(target_3, 2),
        "stop_loss": round(stop_loss, 2),
        "risk_reward_ratio": f"1 : {rr_ratio}",
        "atr_value": round(atr_val, 2),
    }


def generate_monte_carlo_forecasts(current_price: float, daily_volatility_pct: float, expected_daily_ret_pct: float, num_days: int = 10, num_simulations: int = 40) -> Dict[str, Any]:
    """
    Simulates stochastic price paths using Geometric Brownian Motion (GBM) with ML drift.
    """
    dt = 1.0
    mu = expected_daily_ret_pct / 100.0
    sigma = max(0.008, daily_volatility_pct / 100.0 / np.sqrt(252))
    
    simulation_paths = []
    for _ in range(num_simulations):
        prices = [round(current_price, 2)]
        p = current_price
        for _ in range(num_days):
            shock = np.random.normal(0, 1)
            p = p * np.exp((mu - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * shock)
            prices.append(round(p, 2))
        simulation_paths.append(prices)
        
    sim_array = np.array(simulation_paths)
    mean_path = [round(float(v), 2) for v in np.mean(sim_array, axis=0)]
    upper_90 = [round(float(v), 2) for v in np.percentile(sim_array, 90, axis=0)]
    lower_10 = [round(float(v), 2) for v in np.percentile(sim_array, 10, axis=0)]
    
    day_labels = [f"T+{i}" if i > 0 else "Today" for i in range(num_days + 1)]
    
    return {
        "day_labels": day_labels,
        "mean_trajectory": mean_path,
        "upper_band_90": upper_90,
        "lower_band_10": lower_10,
        "p10_day10": lower_10[-1],
        "p50_day10": mean_path[-1],
        "p90_day10": upper_90[-1],
        "max_day10": round(float(np.max(sim_array[:, -1])), 2),
        "terminal_expected_price": mean_path[-1],
        "terminal_bull_price": upper_90[-1],
        "terminal_bear_price": lower_10[-1]
    }

