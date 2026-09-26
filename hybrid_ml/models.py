"""
Hybrid Machine Learning Model Architectures
Combines Tree-Based Gradient Boosting and PyTorch Sequential Deep Learning (BiLSTM/GRU)
with a Dynamic Variance-Weighted Stacking Meta-Learner.
"""

import os
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List, Optional
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.preprocessing import RobustScaler, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error

# Set deterministic seed
torch.manual_seed(42)
np.random.seed(42)

# ── 1. PyTorch Sequential Deep Learning Architecture (BiLSTM + Attention Head) ──
class StockSequenceDataset(Dataset):
    def __init__(self, X: np.ndarray, y: np.ndarray):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.float32)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


class BiLSTMStockNetwork(nn.Module):
    """
    Bidirectional LSTM with Temporal Attention and Multi-Layer Dense Head.
    Captures multi-day momentum memory and sequential price action dependencies.
    """
    def __init__(self, input_dim: int, hidden_dim: int = 64, num_layers: int = 2, dropout: float = 0.2):
        super(BiLSTMStockNetwork, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # Bidirectional LSTM Layer
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        
        # Temporal Attention Layer
        self.attention = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, 1),
            nn.Softmax(dim=1)
        )
        
        # Fully Connected Prediction Head
        self.fc_head = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: [batch_size, seq_len, input_dim]
        lstm_out, _ = self.lstm(x) # [batch_size, seq_len, hidden_dim * 2]
        
        # Compute attention weights
        attn_weights = self.attention(lstm_out) # [batch_size, seq_len, 1]
        context = torch.sum(lstm_out * attn_weights, dim=1) # [batch_size, hidden_dim * 2]
        
        out = self.fc_head(context) # [batch_size, 1]
        return out.squeeze(-1)


# ── 2. Hybrid Stock Predictor Pipeline ─────────────────────────────────────────
class HybridStockPredictor:
    """
    Hybrid Meta-Predictor combining:
    1. Tree-Based Gradient Boosting Regressor (Tabular Indicator Specialist)
    2. PyTorch BiLSTM Neural Network (Temporal Sequence Specialist)
    3. Inverse-Variance Stacking Meta-Learner (Confidence Weighted Fusion)
    """
    def __init__(self, seq_length: int = 20):
        self.seq_length = seq_length
        self.scaler_X = RobustScaler()
        self.scaler_y = StandardScaler()
        
        # Model 1: Tree Ensembler (Fast GBDT)
        self.tree_model = GradientBoostingRegressor(
            n_estimators=35,
            learning_rate=0.08,
            max_depth=3,
            subsample=0.85,
            random_state=42
        )
        
        # Model 2: Deep Sequential Model
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.nn_model = None
        self.feature_names = []
        self.feature_importances = {}
        self.weights = {"tree": 0.5, "neural": 0.5}

    def _create_sequences(self, X: np.ndarray, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        X_seq, y_seq = [], []
        for i in range(len(X) - self.seq_length):
            X_seq.append(X[i : i + self.seq_length])
            y_seq.append(y[i + self.seq_length])
        return np.array(X_seq), np.array(y_seq)

    def fit(self, feature_df: pd.DataFrame, feature_cols: List[str], target_col: str = "Target_Ret_1D", epochs: int = 6):
        self.feature_names = feature_cols
        
        # Prepare tabular data
        clean_df = feature_df.dropna(subset=feature_cols + [target_col]).copy()
        X_raw = clean_df[feature_cols].values
        y_raw = clean_df[target_col].values

        # Split: Chronological Train (80%) vs Validation (20%)
        split_idx = int(len(X_raw) * 0.8)
        X_train_raw, X_val_raw = X_raw[:split_idx], X_raw[split_idx:]
        y_train_raw, y_val_raw = y_raw[:split_idx], y_raw[split_idx:]

        # Fit Scalers strictly on Train set
        X_train_scaled = self.scaler_X.fit_transform(X_train_raw)
        X_val_scaled = self.scaler_X.transform(X_val_raw)

        # ── 1. Train Tree-Based Model ─────────────────────────────────────────
        self.tree_model.fit(X_train_scaled, y_train_raw)
        tree_val_preds = self.tree_model.predict(X_val_scaled)
        tree_mse = mean_squared_error(y_val_raw, tree_val_preds)
        
        # Extract Feature Importances
        importances = self.tree_model.feature_importances_
        sorted_indices = np.argsort(importances)[::-1]
        self.feature_importances = {
            self.feature_names[i]: round(float(importances[i]) * 100, 2)
            for i in sorted_indices[:10]
        }

        # ── 2. Train PyTorch Sequential Neural Network ────────────────────────
        # Sequence formatting for LSTM
        X_all_scaled = self.scaler_X.transform(X_raw)
        X_seq, y_seq = self._create_sequences(X_all_scaled, y_raw)
        
        seq_split = int(len(X_seq) * 0.8)
        X_train_seq, X_val_seq = X_seq[:seq_split], X_seq[seq_split:]
        y_train_seq, y_val_seq = y_seq[:seq_split], y_seq[seq_split:]

        train_dataset = StockSequenceDataset(X_train_seq, y_train_seq)
        val_dataset = StockSequenceDataset(X_val_seq, y_val_seq)
        
        train_loader = DataLoader(train_dataset, batch_size=64, shuffle=False)
        
        input_dim = len(feature_cols)
        self.nn_model = BiLSTMStockNetwork(input_dim=input_dim, hidden_dim=32, num_layers=1).to(self.device)
        
        criterion = nn.SmoothL1Loss() # Robust to financial market outlier spikes
        optimizer = torch.optim.AdamW(self.nn_model.parameters(), lr=0.005, weight_decay=1e-4)
        
        self.nn_model.train()
        for epoch in range(epochs):
            for batch_x, batch_y in train_loader:
                batch_x, batch_y = batch_x.to(self.device), batch_y.to(self.device)
                optimizer.zero_grad()
                preds = self.nn_model(batch_x)
                loss = criterion(preds, batch_y)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.nn_model.parameters(), max_norm=1.0)
                optimizer.step()

        # Neural validation performance
        self.nn_model.eval()
        with torch.no_grad():
            val_tensor = torch.tensor(X_val_seq, dtype=torch.float32).to(self.device)
            nn_val_preds = self.nn_model(val_tensor).cpu().numpy()
        nn_mse = mean_squared_error(y_val_seq, nn_val_preds)

        # ── 3. Dynamic Inverse-Variance Ensembler Weights ──────────────────────
        inv_tree = 1.0 / (tree_mse + 1e-6)
        inv_nn = 1.0 / (nn_mse + 1e-6)
        total_inv = inv_tree + inv_nn
        
        self.weights = {
            "tree": round(float(inv_tree / total_inv), 3),
            "neural": round(float(inv_nn / total_inv), 3)
        }

    def predict_next(self, feature_df: pd.DataFrame, feature_cols: List[str]) -> Tuple[float, float, float]:
        """
        Generates next-day return prediction using the combined Hybrid ensemble.
        Returns: (hybrid_return_pct, tree_return_pct, nn_return_pct)
        """
        # Recent tabular features
        recent_features = feature_df[feature_cols].iloc[-1:].values
        recent_scaled = self.scaler_X.transform(recent_features)
        
        # 1. Tree prediction
        tree_pred = float(self.tree_model.predict(recent_scaled)[0])
        
        # 2. Neural sequence prediction
        seq_features = feature_df[feature_cols].iloc[-self.seq_length:].values
        seq_scaled = self.scaler_X.transform(seq_features)
        seq_tensor = torch.tensor(seq_scaled[np.newaxis, ...], dtype=torch.float32).to(self.device)
        
        self.nn_model.eval()
        with torch.no_grad():
            nn_pred = float(self.nn_model(seq_tensor).cpu().numpy()[0])
            
        # 3. Weighted Fusion
        hybrid_pred = (self.weights["tree"] * tree_pred) + (self.weights["neural"] * nn_pred)
        return hybrid_pred, tree_pred, nn_pred

    def generate_backtest_predictions(self, feature_df: pd.DataFrame, feature_cols: List[str], target_col: str = "Target_Ret_1D") -> pd.DataFrame:
        """
        Generates historical backtest timeline comparing actual vs predicted returns and price paths.
        """
        clean_df = feature_df.dropna(subset=feature_cols + [target_col]).copy()
        X_raw = clean_df[feature_cols].values
        X_scaled = self.scaler_X.transform(X_raw)
        
        # Tree predictions
        tree_preds = self.tree_model.predict(X_scaled)
        
        # Neural predictions via batched tensor evaluation
        nn_preds = list(tree_preds[:self.seq_length])
        if len(X_raw) > self.seq_length:
            seq_list = [X_scaled[i - self.seq_length : i] for i in range(self.seq_length, len(X_raw))]
            seq_tensor = torch.tensor(np.array(seq_list), dtype=torch.float32).to(self.device)
            self.nn_model.eval()
            with torch.no_grad():
                batched_out = self.nn_model(seq_tensor).cpu().numpy().tolist()
            if isinstance(batched_out, float):
                batched_out = [batched_out]
            nn_preds.extend(batched_out)
        
        nn_preds = np.array(nn_preds)
        hybrid_preds = (self.weights["tree"] * tree_preds) + (self.weights["neural"] * nn_preds)
        
        clean_df['Pred_Tree_Ret'] = tree_preds
        clean_df['Pred_NN_Ret'] = nn_preds
        clean_df['Pred_Hybrid_Ret'] = hybrid_preds
        
        # Synthesize predicted next-day close price
        clean_df['Pred_Close'] = clean_df['Close'] * (1 + clean_df['Pred_Hybrid_Ret'] / 100)
        return clean_df
