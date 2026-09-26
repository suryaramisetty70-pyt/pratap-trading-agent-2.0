"""
Surya AI Auto-Training Job & Validation Orchestrator
Executes multi-asset data training, generates candidate model checkpoints,
evaluates against the Lopez de Prado Purged 5-Fold Validation Gate,
and atomically updates the Model Registry.
"""

import os
import sys
import time
import argparse
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from hybrid_ml.feature_engineering import fetch_and_prepare_features
from hybrid_ml.models import HybridStockPredictor
from hybrid_ml.hybrid_pipeline import FEATURE_COLUMNS
from auto_train.model_registry import (
    get_current_model_info,
    promote_model,
    record_training_run
)
from auto_train.validation_gate import ValidationGate, PurgedKFold

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("trainer_job")

# High-liquidity universe leaders for model training
BENCHMARK_TICKERS = [
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", 
    "TATAMOTORS", "ITC", "BHARTIARTL", "SBIN", "LT"
]


def run_auto_train_job(
    tickers: Optional[List[str]] = None,
    period: str = "5y",
    force_promote: bool = False,
    epochs: int = 10
) -> Dict[str, Any]:
    """
    End-to-end auto-training workflow:
    1. Ingests data across representative tickers
    2. Builds Purged 5-Fold Cross Validation partitions
    3. Trains and evaluates candidate models out-of-sample
    4. Evaluates against Validation Gate vs Current Model
    5. Conditionally promotes or rejects candidate
    """
    job_start_time = time.time()
    logger.info("==================================================")
    logger.info("Starting Surya AI Auto-Training & Validation Job")
    logger.info("==================================================")

    if not tickers:
        tickers = BENCHMARK_TICKERS[:3] # Fast & robust 3-stock primary core

    logger.info(f"Target Training Assets: {tickers} | Historical Period: {period}")

    # Step 1: Collect and engineer features across assets
    all_dfs = []
    for sym in tickers:
        try:
            df, meta = fetch_and_prepare_features(sym, period=period)
            if len(df) > 100:
                all_dfs.append(df)
                logger.info(f"Loaded {len(df)} bars of feature data for {sym}")
        except Exception as e:
            logger.warning(f"Error preparing features for {sym}: {e}")

    if not all_dfs:
        error_msg = "No sufficient feature data could be loaded for any candidate ticker."
        logger.error(error_msg)
        return {"status": "error", "message": error_msg}

    # Combine multi-asset datasets
    dataset = pd.concat(all_dfs).sort_index()
    valid_features = [c for c in FEATURE_COLUMNS if c in dataset.columns]
    target_col = "Target_Ret_1D"

    dataset = dataset.dropna(subset=valid_features + [target_col])
    logger.info(f"Combined Training Matrix Shape: {dataset.shape} with {len(valid_features)} features.")

    # Step 2: Purged 5-Fold Cross-Validation
    gate = ValidationGate(min_hit_rate_delta=0.005)
    cv = PurgedKFold(n_splits=5, pct_embargo=0.01)
    
    fold_metrics: List[Dict[str, float]] = []
    fold_idx = 1

    for train_idx, test_idx in cv.split(dataset):
        train_data = dataset.iloc[train_idx]
        test_data = dataset.iloc[test_idx]

        # Train candidate fold model
        fold_model = HybridStockPredictor(seq_length=15)
        fold_model.fit(train_data, feature_cols=valid_features, target_col=target_col, epochs=epochs)

        # Predict out-of-sample
        backtest_df = fold_model.generate_backtest_predictions(test_data, valid_features, target_col=target_col)
        
        # Calculate fold metrics
        metrics = gate.evaluate_predictions(
            actual_returns=backtest_df['Target_Ret_1D'].values,
            pred_returns=backtest_df['Pred_Hybrid_Ret'].values
        )
        fold_metrics.append(metrics)
        logger.info(f"Fold {fold_idx}/5 Metrics -> Hit Rate: {metrics['hit_rate']*100:.2f}%, Sortino: {metrics['sortino_ratio']:.2f}, RMSE: {metrics['rmse']:.5f}")
        fold_idx += 1

    # Step 3: Run Validation Gate Evaluation
    current_prod_info = get_current_model_info()
    current_metrics = current_prod_info.get("metrics", {})
    
    gate_result = gate.evaluate_candidate(fold_metrics, current_metrics)
    
    version_tag = f"v_{time.strftime('%Y%m%d_%H%M%S')}"
    passed = gate_result["passed"] or force_promote

    logger.info("--------------------------------------------------")
    logger.info(f"VALIDATION GATE DECISION: {'PASSED (PROMOTED)' if passed else 'REJECTED (KEPT EXISTING)'}")
    logger.info(f"Reason: {gate_result['reason']}")
    logger.info("--------------------------------------------------")

    # Step 4: Final Fit on full dataset & Promotion if passed
    final_artifacts = {}
    if passed:
        logger.info("Fitting finalized production ensemble on full dataset...")
        final_model = HybridStockPredictor(seq_length=15)
        final_model.fit(dataset, feature_cols=valid_features, target_col=target_col, epochs=epochs)
        
        final_artifacts["tree_model"] = final_model.tree_model
        final_artifacts["scaler_X"] = final_model.scaler_X
        final_artifacts["scaler_y"] = final_model.scaler_y

        promoted_record = promote_model(
            version_tag=version_tag,
            metrics=gate_result["candidate_metrics"],
            artifacts=final_artifacts,
            notes=f"Auto-trained on {len(tickers)} tickers ({', '.join(tickers)}). Gate: {gate_result['reason']}"
        )
    else:
        promoted_record = None

    elapsed_time = round(time.time() - job_start_time, 2)

    # Step 5: Record audit run in registry
    run_record = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "version_evaluated": version_tag,
        "passed_gate": passed,
        "reason": gate_result["reason"],
        "candidate_metrics": gate_result["candidate_metrics"],
        "baseline_metrics": current_metrics,
        "elapsed_seconds": elapsed_time,
        "tickers_used": tickers
    }
    record_training_run(run_record)

    return {
        "status": "success",
        "passed_gate": passed,
        "version_tag": version_tag,
        "promoted_record": promoted_record,
        "gate_result": gate_result,
        "elapsed_seconds": elapsed_time,
        "tickers": tickers
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Surya AI Auto-Training Job")
    parser.add_argument("--tickers", type=str, default="RELIANCE,TCS,INFY", help="Comma-separated ticker list")
    parser.add_argument("--period", type=str, default="2y", help="Historical data period")
    parser.add_argument("--force", action="store_true", help="Force promotion bypassing gate")
    args = parser.parse_args()

    ticker_list = [s.strip().upper() for s in args.tickers.split(",") if s.strip()]
    res = run_auto_train_job(tickers=ticker_list, period=args.period, force_promote=args.force, epochs=8)
    import json
    print(json.dumps(res, indent=2, default=str))
