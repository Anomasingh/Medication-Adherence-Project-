# Backend Prediction Logic Explanation

## Overview
Your backend uses **pre-trained machine learning models** (XGBoost) that were trained on historical medication adherence data. The models predict whether a patient is likely to be **Adherent** (class 1) or **Non-Adherent** (class 0) based on 10 financial and claims-related features.

---

## How Predictions Work (Step-by-Step)

### **Step 1: Request Receives Data**
```
Frontend sends JSON payload with 10 features in correct order:
{
  "NUM_CLAIMS": 11,
  "CLAIM_IRREGULARITY": 19.84,
  "TOTAL_PAID_AMT": 78918.47,
  "AVG_PAID_AMT": 7831.44,
  "AVG_CLAIM_AMT": 8156.24,
  "PAYMENT_RATIO": 1,
  "AVG_UNITS": 50.48,
  "NUM_MEDICATIONS": 2,
  "NUM_PROVIDERS": 1,
  "OUT_OF_POCKET_COST": 0
}
```

### **Step 2: Feature Validation**
```python
_validate_required_features(data, required_features)
```
- Checks that ALL 10 required features exist in the payload
- Rejects request if ANY feature is missing with HTTP 400 error
- Previously there was a `.get(f, 0)` fallback that masked errors ✗

### **Step 3: Feature Scaling/Normalization**
```python
scaled_values = _prepare_scaled_input(data, required_features, scaler)
```
- Converts raw values to numpy array [1, 10] shape
- **Applies StandardScaler** (fitted on original training data)
- StandardScaler formula: `(value - mean) / std_dev`
- **Example scaling:**
  - `NUM_CLAIMS: 11` → after scaling → normalized value
  - Different features have different means/stds

**This is CRITICAL:** The scaler MUST match exactly how the model was trained. If features arrive in wrong order, scaling happens on wrong positions!

### **Step 4: Model Prediction**
```python
pred = xgb_model.predict(scaled_values)        # [0] or [1]
prob = xgb_model.predict_proba(scaled_values)  # [0.97, 0.03]
```

**XGBoost Model Characteristics:**
- **Type:** Gradient Boosting ensemble of decision trees
- **Classes:** 0 = Non-Adherent, 1 = Adherent
- **Output 1 - predict():** Single class label (0 or 1) - hard decision
- **Output 2 - predict_proba():** Probability for each class [class_0_prob, class_1_prob]

### **Step 5: Response to Frontend**
```json
{
  "prediction": 0,
  "probability": {
    "class_0": 0.9725,
    "class_1": 0.0275
  },
  "features_used": ["NUM_CLAIMS", "CLAIM_IRREGULARITY", ...]
}
```

---

## Common Issues & Why Predictions Might Be Wrong

### **Issue 1: Feature Order Mismatch** ✗ FIXED
**Problem:** Frontend sending features in wrong order
```
Expected: [NUM_CLAIMS, CLAIM_IRREGULARITY, TOTAL_PAID_AMT, ...]
Sent:     [NUM_CLAIMS, CLAIM_IRREGULARITY, AVG_UNITS, NUM_MEDICATIONS, ...]
```
**Impact:** Model receives scrambled data, applies weights to wrong positions
**Solution:** Frontend now sends in exact backend order ✓

### **Issue 2: Feature Scaling Mismatch**
**Problem:** If raw values outside training data range
- Training data might have NUM_CLAIMS max = 100
- Test case uses NUM_CLAIMS = 1000
- Scaler extrapolates = unpredictable scaling

**Diagnosis:** Check if model probabilities don't change when features change drastically

### **Issue 3: Missing or Silent Feature Fallbacks**
**Problem:** Old code used `.get(feature, 0)` fallback
- If feature missing, silently becomes 0
- Model trained with real distribution, now gets 0 = garbage prediction

**Solution:** Backend now rejects with HTTP 400 if missing ✓

### **Issue 4: Class Definition Ambiguity**
**Problem:** Which class means "good" adherence?
- Backend: class_0 = Non-Adherent (bad), class_1 = Adherent (good)
- Frontend displays accordingly

---

## Model Training Context (From Notebooks)

The models were trained on historical diabetes/hypertension patient data with:
- **Target:** Binary classification (Adherent/Non-Adherent)
- **Features:** 10 numerical features (claims, costs, medications)
- **Training Set:** ~3,555 patients (80%)
- **Test Set:** ~887 patients (20%)
- **Preprocessing:**
  - StandardScaler on numerical features
  - SMOTE for class imbalance (oversampling minority)
- **Model:** XGBoost with default hyperparameters

---

## How to Verify Predictions Are Correct

### **Test Case 1: Minimal Values**
```json
{
  "NUM_CLAIMS": 1,
  "CLAIM_IRREGULARITY": 0.1,
  "TOTAL_PAID_AMT": 100,
  "AVG_PAID_AMT": 100,
  "AVG_CLAIM_AMT": 100,
  "PAYMENT_RATIO": 0.1,
  "AVG_UNITS": 1,
  "NUM_MEDICATIONS": 1,
  "NUM_PROVIDERS": 1,
  "OUT_OF_POCKET_COST": 0
}
```
**Expected:** class_1 probability ~38% (non-adherent, makes sense - low claims/usage)

### **Test Case 2: High Engagement**
```json
{
  "NUM_CLAIMS": 50,
  "CLAIM_IRREGULARITY": 5.0,
  "TOTAL_PAID_AMT": 500000,
  "AVG_PAID_AMT": 25000,
  "AVG_CLAIM_AMT": 50000,
  "PAYMENT_RATIO": 5,
  "AVG_UNITS": 100,
  "NUM_MEDICATIONS": 10,
  "NUM_PROVIDERS": 5,
  "OUT_OF_POCKET_COST": 0
}
```
**Expected:** class_1 probability should change (high engagement patterns)

### **Debugging Approach:**
1. Send same test data twice - probabilities should be identical (reproducible)
2. Change ONE feature at a time, check if probability moves
3. If probability doesn't change when features change = model/scaling issue
4. Check backend logs for scaling values being applied

---

## Current Prediction Pipeline

```
Frontend Form Input
    ↓
Build payload with CORRECT feature order
    ↓
POST to http://127.0.0.1:8000/predict/diabetes
    ↓
Backend receives payload
    ↓
Validate 10 required features present → HTTPException(400) if missing
    ↓
Extract values in order: [NUM_CLAIMS, CLAIM_IRREGULARITY, TOTAL_PAID_AMT, ...]
    ↓
Scale using StandardScaler (fitted on training data)
    ↓
XGBoost predict() → class label 0/1
XGBoost predict_proba() → probabilities [0.97, 0.03]
    ↓
Return JSON response with prediction + probabilities
    ↓
Frontend displays prediction and confidence percentage
```

---

## Questions to Help Debug

If predictions still seem wrong, answer:

1. **Are the same input values always giving the same output?**
   - If NO = model/scaling issue
   - If YES = model is working correctly, but logic might be different

2. **Do probabilities change when you significantly modify values?**
   - Change NUM_CLAIMS from 1 to 100
   - Check if class_1 probability moves

3. **What are the exact input values vs exact probabilities output?**
   - Share test case + backend response

4. **Are class definitions what you expected?**
   - class_0 = Non-Adherent (should have HIGH probability for low engagement patients)
   - class_1 = Adherent (should have HIGH probability for high engagement patients)
