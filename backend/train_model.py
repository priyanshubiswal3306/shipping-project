"""
train_model.py
--------------
Train a Random Forest Classifier on the Kaggle E-Commerce Shipping dataset
and persist the model + label-encoder to the models/ directory.

Dataset: https://www.kaggle.com/datasets/prachi13/customer-analytics
Place `Train.csv` inside backend/data/ before running this script.

Usage:
    cd backend
    python train_model.py
"""

import os
import pickle
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, "data", "Train.csv")
MODEL_DIR  = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "delay_predictor.pkl")
ENC_PATH   = os.path.join(MODEL_DIR, "label_encoder.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

# ── Load data ──────────────────────────────────────────────────────────────────
print(f"[INFO] Loading data from: {DATA_PATH}")
df = pd.read_csv(DATA_PATH)
print(f"[INFO] Dataset shape: {df.shape}")
print(f"[INFO] Columns: {list(df.columns)}")

# ── Feature selection ──────────────────────────────────────────────────────────
FEATURES = [
    "Weight_in_gms",
    "Discount_offered",
    "Cost_of_the_Product",
    "Prior_purchases",
    "Mode_of_Shipment",
]
TARGET = "Reached.on.Time_Y.N"   # 1 = Delayed, 0 = On Time

df = df[FEATURES + [TARGET]].dropna()

# ── Encode Mode_of_Shipment ────────────────────────────────────────────────────
# Convert to str first to avoid Pandas dtype-strictness issues, then overwrite.
le = LabelEncoder()
df["Mode_of_Shipment"] = df["Mode_of_Shipment"].astype(str)
df["Mode_of_Shipment"] = le.fit_transform(df["Mode_of_Shipment"])

print(f"[INFO] Shipment classes: {list(le.classes_)}")

# ── Train / test split ─────────────────────────────────────────────────────────
X = df[FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ── Train Random Forest ────────────────────────────────────────────────────────
print("[INFO] Training Random Forest Classifier …")
clf = RandomForestClassifier(
    n_estimators=150,
    max_depth=10,
    random_state=42,
    n_jobs=-1,
)
clf.fit(X_train, y_train)

# ── Evaluate ───────────────────────────────────────────────────────────────────
y_pred = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\n[RESULT] Test Accuracy: {acc:.4f}")
print("\n[RESULT] Classification Report:")
print(classification_report(y_test, y_pred, target_names=["On Time", "Delayed"]))

# ── Persist ────────────────────────────────────────────────────────────────────
with open(MODEL_PATH, "wb") as f:
    pickle.dump(clf, f)
print(f"[INFO] Model saved → {MODEL_PATH}")

with open(ENC_PATH, "wb") as f:
    pickle.dump(le, f)
print(f"[INFO] LabelEncoder saved → {ENC_PATH}")

print("\n[DONE] Training complete.")
