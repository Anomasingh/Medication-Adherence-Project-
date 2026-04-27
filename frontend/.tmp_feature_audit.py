import json
import numpy as np
import pandas as pd
from pathlib import Path

base = Path(r"c:/Users/anoma/OneDrive/Desktop/Documents/Medication adherence project/google colab work")
dia_path = base / "Final_Diabetes Adherence Data.xlsx"
htn_path = base / "Final_HTN Adherence Data.xlsx"

# ---------- Diabetes feature engineering (from notebook logic) ----------
df_d = pd.read_excel(dia_path, sheet_name=0)
for c in ["UNITS", "AMOUNT CLAIMED", "TOTAL AMOUNT PAID", "PAID FROM RISK AMT", "TARIFF", "CURRENT AGE"]:
    if c in df_d.columns:
        df_d[c] = pd.to_numeric(df_d[c], errors="coerce")

df_d["SERVICE DATE"] = pd.to_datetime(df_d["SERVICE DATE"], errors="coerce")

def calc_claim_irregularity(dates):
    s = pd.Series(dates).dropna().sort_values()
    if len(s) <= 1:
        return 0.0
    diffs = s.diff().dt.days.dropna()
    if len(diffs) == 0:
        return 0.0
    return float(diffs.std(ddof=0)) if np.isfinite(diffs.std(ddof=0)) else 0.0

patient_d = df_d.groupby("MEMBER").agg({
    "CLAIM NO": "count",              # NUM_CLAIMS
    "PROVIDER": "nunique",            # NUM_PROVIDERS
    "UNITS": "mean",                  # AVG_UNITS
    "CODE DESCRIPTION": "nunique",    # NUM_MEDICATIONS
    "AMOUNT CLAIMED": "mean",         # AVG_CLAIM_AMT
    "TOTAL AMOUNT PAID": ["mean", "sum"],  # AVG_PAID_AMT, TOTAL_PAID_AMT
    "SERVICE DATE": lambda x: calc_claim_irregularity(x),
}).reset_index()
patient_d.columns = [
    "MEMBER", "NUM_CLAIMS", "NUM_PROVIDERS", "AVG_UNITS", "NUM_MEDICATIONS",
    "AVG_CLAIM_AMT", "AVG_PAID_AMT", "TOTAL_PAID_AMT", "CLAIM_IRREGULARITY"
]
patient_d["PAYMENT_RATIO"] = patient_d["AVG_PAID_AMT"] / (patient_d["AVG_CLAIM_AMT"] + 1)
patient_d["OUT_OF_POCKET_COST"] = patient_d["AVG_CLAIM_AMT"] - patient_d["AVG_PAID_AMT"]

dia_features = [
    "NUM_CLAIMS", "CLAIM_IRREGULARITY", "TOTAL_PAID_AMT", "AVG_PAID_AMT", "AVG_CLAIM_AMT",
    "PAYMENT_RATIO", "AVG_UNITS", "NUM_MEDICATIONS", "NUM_PROVIDERS", "OUT_OF_POCKET_COST"
]

# ---------- Hypertension feature engineering (aligned to notebook feature names) ----------
df_h = pd.read_excel(htn_path, sheet_name=0)
for c in ["UNITS", "AMOUNT CLAIMED", "PAID FROM RISK AMT", "TARIFF"]:
    if c in df_h.columns:
        df_h[c] = pd.to_numeric(df_h[c], errors="coerce")

# Approximate notebook engineered row-level features to recover named inputs
text = df_h["CODE DESCRIPTION"].astype(str)
df_h["IS_COMBINATION_DRUG"] = text.str.contains(r"\+|/| COMB|COMBINATION", case=False, regex=True).astype(int)
# Extract dosage in mg if present, else 0
mg = text.str.extract(r"(\d+(?:\.\d+)?)\s*MG", expand=False)
df_h["DOSAGE_MG"] = pd.to_numeric(mg, errors="coerce").fillna(0.0)
# High amount flag from dataset median (row-level)
amount_median = pd.to_numeric(df_h["AMOUNT CLAIMED"], errors="coerce").median()
df_h["HIGH_AMOUNT"] = (pd.to_numeric(df_h["AMOUNT CLAIMED"], errors="coerce") > amount_median).astype(int)
# Count per member then take first at aggregation stage
claim_counts = df_h.groupby("MEMBER")["MEMBER"].transform("count")
df_h["NUM_CLAIMS"] = claim_counts

def nunique_nonnull(s):
    return s.dropna().nunique()

patient_h = df_h.groupby("MEMBER").agg({
    "NUM_CLAIMS": "first",
    "CODE DESCRIPTION": nunique_nonnull,
    "IS_COMBINATION_DRUG": ["mean", "sum"],
    "PAID FROM RISK AMT": "sum",
    "TARIFF": "mean",
    "DOSAGE_MG": "max",
    "HIGH_AMOUNT": "mean",
    "UNITS": ["sum", "std"],
}).reset_index()
patient_h.columns = [
    "MEMBER", "NUM_CLAIMS_first", "DRUG_NAME_ENC_nunique", "IS_COMBINATION_DRUG_mean",
    "IS_COMBINATION_DRUG_sum", "PAID_FROM_RISK_AMT_sum", "TARIFF_mean", "DOSAGE_MG_max",
    "HIGH_AMOUNT_mean", "UNITS_sum", "UNITS_std"
]
patient_h["UNITS_std"] = patient_h["UNITS_std"].fillna(0.0)

htn_features = [
    "NUM_CLAIMS_first", "DRUG_NAME_ENC_nunique", "IS_COMBINATION_DRUG_mean", "IS_COMBINATION_DRUG_sum",
    "PAID_FROM_RISK_AMT_sum", "TARIFF_mean", "DOSAGE_MG_max", "HIGH_AMOUNT_mean", "UNITS_sum", "UNITS_std"
]

def feature_stats(df, features):
    out = {}
    for f in features:
        s = pd.to_numeric(df[f], errors="coerce").dropna()
        if s.empty:
            continue
        is_int_like = bool(np.allclose(s, np.round(s), atol=1e-9))
        step = 1 if is_int_like else 0.01
        med = float(np.median(s))
        if is_int_like:
            med = int(round(med))
        else:
            med = round(med, 2)
        out[f] = {
            "min": int(np.floor(s.min())) if is_int_like else round(float(s.min()), 2),
            "max": int(np.ceil(s.max())) if is_int_like else round(float(s.max()), 2),
            "median": med,
            "step": step,
            "integer": is_int_like,
        }
    return out

result = {
    "diabetes": feature_stats(patient_d, dia_features),
    "hypertension": feature_stats(patient_h, htn_features),
}
print(json.dumps(result, indent=2))
