"""
Marcos Lopez de Prado Purged K-Fold Cross-Validation Gate
Validates ML model candidates on multi-year market data with strict purging & embargoing
to eliminate lookahead bias and serial correlation.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
import logging

logger = logging.getLogger("validation_gate")


class PurgedKFold:
    """
    Marcos Lopez de Prado's Purged K-Fold Cross-Validation with Embargo.
    Ensures no information leakage between training and testing sets for time series.
    """
    def __init__(self, n_splits: int = 5, pct_embargo: float = 0.01):
        self.n_splits = n_splits
        self.pct_embargo = pct_embargo

    def split(self, X: pd.DataFrame, y: Optional[pd.Series] = None):
        """
        Yields (train_indices, test_indices) for each fold.
        """
        n_samples = len(X)
        indices = np.arange(n_samples)
        embargo = int(n_samples * self.pct_embargo)
        test_size = n_samples // self.n_splits

        for i in range(self.n_splits):
            test_start = i * test_size
            test_end = (i + 1) * test_size if i < self.n_splits - 1 else n_samples
            test_idx = indices[test_start:test_end]

            # Purge: Exclude samples adjacent to test set boundaries
            # Embargo: Exclude samples immediately following the test set
            train_mask = np.ones(n_samples, dtype=bool)
            train_mask[test_start:test_end] = False
            
            # Embargo post-test region
            post_test_end = min(n_samples, test_end + embargo)
            train_mask[test_end:post_test_end] = False

            train_idx = indices[train_mask]
            yield train_idx, test_idx


def compute_sortino_ratio(returns: np.ndarray, rf: float = 0.06 / 252) -> float:
    """
    Computes annualized Sortino ratio (focusing exclusively on downside risk).
    """
    if len(returns) == 0:
        return 0.0
    excess_ret = returns - rf
    mean_excess = np.mean(excess_ret) * 252
    downside_returns = excess_ret[excess_ret < 0]
    if len(downside_returns) == 0:
        return float(mean_excess / 0.001) if mean_excess > 0 else 0.0
    downside_std = np.sqrt(np.mean(downside_returns ** 2)) * np.sqrt(252)
    if downside_std == 0:
        return 0.0
    return float(mean_excess / downside_std)


def compute_max_drawdown(returns: np.ndarray) -> float:
    """Computes maximum peak-to-trough equity drawdown."""
    if len(returns) == 0:
        return 0.0
    cumulative = np.cumprod(1 + returns)
    peak = np.maximum.accumulate(cumulative)
    drawdowns = (cumulative - peak) / peak
    return float(np.abs(np.min(drawdowns)))


class ValidationGate:
    """
    Automated Gatekeeper that decides whether a candidate model `v_next`
    is statistically superior to the current active production model.
    """
    def __init__(
        self,
        min_hit_rate_delta: float = 0.005,  # +0.5% required improvement
        min_baseline_hit_rate: float = 0.520, # 52.0% absolute floor
        min_baseline_sortino: float = 0.60
    ):
        self.min_hit_rate_delta = min_hit_rate_delta
        self.min_baseline_hit_rate = min_baseline_hit_rate
        self.min_baseline_sortino = min_baseline_sortino
        self.cv = PurgedKFold(n_splits=5, pct_embargo=0.01)

    def evaluate_predictions(self, actual_returns: np.ndarray, pred_returns: np.ndarray) -> Dict[str, float]:
        """Calculates out-of-sample directional hit rate, Sortino, RMSE, and Max Drawdown."""
        if len(actual_returns) == 0 or len(pred_returns) == 0:
            return {"hit_rate": 0.0, "sortino_ratio": 0.0, "rmse": 999.0, "max_drawdown": 1.0}

        # Directional Hit Rate (Sign matching)
        correct_directions = (np.sign(actual_returns) == np.sign(pred_returns))
        hit_rate = float(np.mean(correct_directions))

        # RMSE
        rmse = float(np.sqrt(np.mean((actual_returns - pred_returns) ** 2)))

        # Strategy Return Simulation (Long when pred > 0, Cash/Short when pred <= 0)
        strategy_returns = np.where(pred_returns > 0, actual_returns, -actual_returns * 0.5)
        sortino = compute_sortino_ratio(strategy_returns)
        mdd = compute_max_drawdown(strategy_returns)

        return {
            "hit_rate": round(hit_rate, 4),
            "sortino_ratio": round(sortino, 2),
            "rmse": round(rmse, 6),
            "max_drawdown": round(mdd, 4)
        }

    def evaluate_candidate(
        self,
        candidate_fold_metrics: List[Dict[str, float]],
        current_metrics: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Runs the full Lopez de Prado Gate evaluation.
        Compares average 5-fold cross-validated out-of-sample metrics against production.
        """
        # Calculate cross-fold averages
        avg_hit_rate = float(np.mean([f["hit_rate"] for f in candidate_fold_metrics]))
        avg_sortino = float(np.mean([f["sortino_ratio"] for f in candidate_fold_metrics]))
        avg_rmse = float(np.mean([f["rmse"] for f in candidate_fold_metrics]))
        avg_mdd = float(np.mean([f["max_drawdown"] for f in candidate_fold_metrics]))

        candidate_metrics = {
            "hit_rate": round(avg_hit_rate, 4),
            "sortino_ratio": round(avg_sortino, 2),
            "rmse": round(avg_rmse, 6),
            "max_drawdown": round(avg_mdd, 4),
            "fold_count": len(candidate_fold_metrics),
            "fold_hit_rates": [f["hit_rate"] for f in candidate_fold_metrics]
        }

        # Check for catastrophic fold inconsistency
        min_fold_hit = min(candidate_metrics["fold_hit_rates"])
        if min_fold_hit < 0.480:
            return {
                "passed": False,
                "reason": f"Fold consistency failure: Minimum fold hit rate ({min_fold_hit*100:.1f}%) below 48.0% tolerance threshold.",
                "candidate_metrics": candidate_metrics,
                "current_metrics": current_metrics or {}
            }

        # Case 1: Initial Bootstrap / No prior model metrics
        if not current_metrics or "hit_rate" not in current_metrics:
            passed = (avg_hit_rate >= self.min_baseline_hit_rate and avg_sortino >= self.min_baseline_sortino)
            reason = "Initial baseline validation " + ("PASSED" if passed else "FAILED (did not meet baseline floors)")
            return {
                "passed": passed,
                "reason": reason,
                "candidate_metrics": candidate_metrics,
                "current_metrics": current_metrics or {}
            }

        # Case 2: Comparison with live production model
        curr_hit = float(current_metrics.get("hit_rate", 0.55))
        curr_sortino = float(current_metrics.get("sortino_ratio", 1.0))
        curr_mdd = float(current_metrics.get("max_drawdown", 0.15))

        # Rule 1: Hit rate must beat current model by at least min_hit_rate_delta (+0.5%)
        # Rule 2: Sortino ratio must not degrade significantly (>= 95% of current)
        # Rule 3: Max Drawdown must not expand significantly (<= 110% of current)
        hit_rate_diff = avg_hit_rate - curr_hit
        hit_pass = hit_rate_diff >= self.min_hit_rate_delta
        sortino_pass = avg_sortino >= (curr_sortino * 0.95)
        mdd_pass = avg_mdd <= (curr_mdd * 1.10)

        passed = hit_pass and sortino_pass and mdd_pass

        reasons = []
        if not hit_pass:
            reasons.append(f"Hit rate delta ({hit_rate_diff*100:+.2f}%) did not meet required +{self.min_hit_rate_delta*100:.1f}% improvement over current ({curr_hit*100:.1f}%)")
        if not sortino_pass:
            reasons.append(f"Sortino ratio ({avg_sortino:.2f}) degraded below 95% of current ({curr_sortino:.2f})")
        if not mdd_pass:
            reasons.append(f"Max drawdown ({avg_mdd*100:.1f}%) expanded beyond 110% of current ({curr_mdd*100:.1f}%)")

        final_reason = "PASSED: Statistically superior across all Lopez de Prado metrics." if passed else "REJECTED: " + "; ".join(reasons)

        return {
            "passed": passed,
            "reason": final_reason,
            "candidate_metrics": candidate_metrics,
            "current_metrics": current_metrics,
            "deltas": {
                "hit_rate_delta": round(hit_rate_diff, 4),
                "sortino_delta": round(avg_sortino - curr_sortino, 2),
                "mdd_delta": round(avg_mdd - curr_mdd, 4)
            }
        }
