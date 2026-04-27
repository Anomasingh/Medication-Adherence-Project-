from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import os
import pickle
import time

ml_assets = {}


def _install_sklearn_pickle_shims():
    try:
        from sklearn.compose import _column_transformer

        if not hasattr(_column_transformer, "_RemainderColsList"):
            class _RemainderColsList(list):
                pass

            _column_transformer._RemainderColsList = _RemainderColsList
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    _install_sklearn_pickle_shims()
    model_path = os.path.join(os.path.dirname(__file__), "..", "models")

    assets_to_load = [
        ("htn_model", "hypertension_model.pkl"),
        ("htn_scaler", "hypertension_scaler.pkl"),
        ("htn_features", "hypertension_features.pkl"),
        ("dia_model", "diabetes_model.pkl"),
        ("dia_scaler", "diabetes_scaler.pkl"),
        ("dia_features", "diabetes_features.pkl"),
    ]

    for asset_key, filename in assets_to_load:
        started_at = time.time()
        file_path = os.path.join(model_path, filename)
        with open(file_path, "rb") as f:
            ml_assets[asset_key] = pickle.load(f)
        elapsed = time.time() - started_at
        print(f"Loaded {filename} in {elapsed:.4f} seconds")
        if filename.endswith("model.pkl") or filename.endswith("scaler.pkl"):
            print(
                f"{filename} n_features_in_ = {getattr(ml_assets[asset_key], 'n_features_in_', 'Unknown')}"
            )

    yield

    ml_assets.clear()
    print("Cleared ML assets from memory")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Medication Adherence Prediction API 🚀", "version": "1.0"}


def _extract_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Request body must be a JSON object.")

    data = payload.get("data", payload)
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=400,
            detail="Request body must contain a JSON object payload.",
        )

    return data


def _validate_required_features(data: dict, required_features: list[str]) -> None:
    missing_features = [feature for feature in required_features if feature not in data]
    if missing_features:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing required feature keys.",
                "missing_features": missing_features,
            },
        )


def _prepare_scaled_input(data: dict, required_features: list[str], scaler) -> np.ndarray:
    values = [data[feature] for feature in required_features]
    values = np.array(values, dtype=float).reshape(1, -1)
    return scaler.transform(values)


@app.post("/predict/hypertension")
def predict_htn(payload: dict):
    try:
        htn_model = ml_assets["htn_model"]
        htn_scaler = ml_assets["htn_scaler"]
        htn_features = ml_assets["htn_features"]

        data = _extract_payload(payload)
        _validate_required_features(data, htn_features)

        scaled_values = _prepare_scaled_input(data, htn_features, htn_scaler)
        pred = htn_model.predict(scaled_values)[0]
        prob = htn_model.predict_proba(scaled_values)[0]

        return {
            "prediction": int(pred),
            "probability": {
                "class_0": float(prob[0]),
                "class_1": float(prob[1]),
            },
            "features_used": htn_features,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/diabetes")
def predict_diabetes(payload: dict):
    try:
        dia_model = ml_assets["dia_model"]
        dia_scaler = ml_assets["dia_scaler"]
        dia_features = ml_assets["dia_features"]

        data = _extract_payload(payload)
        _validate_required_features(data, dia_features)

        scaled_values = _prepare_scaled_input(data, dia_features, dia_scaler)
        pred = dia_model.predict(scaled_values)[0]
        prob = dia_model.predict_proba(scaled_values)[0]

        return {
            "prediction": int(pred),
            "probability": {
                "class_0": float(prob[0]),
                "class_1": float(prob[1]),
            },
            "features_used": dia_features,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))