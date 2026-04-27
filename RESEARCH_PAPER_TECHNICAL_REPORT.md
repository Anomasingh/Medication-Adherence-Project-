# Clinical Medication Adherence Prediction System
## Technical Research Paper & Implementation Report

---

## Table of Contents
1. Introduction
2. Requirements Specifications
3. System Design
4. System Implementation
5. Testing Documents
6. Installation Guidelines
7. Conclusion and Future Work

---

## 1. Introduction

### 1.1 Background and Problem Statement
Non-adherence to prescribed medications is a critical healthcare challenge affecting patient outcomes, hospital readmission rates, and healthcare costs. The World Health Organization estimates that medication non-adherence rates range from 30-50% in developed countries and up to 90% in developing nations. This non-adherence directly correlates with:

- **Increased hospitalizations** due to disease progression
- **Higher mortality rates** from chronic conditions (diabetes, hypertension)
- **Increased healthcare expenditure** estimated at $100 billion annually in the US alone
- **Reduced quality of life** for patients with preventable complications

### 1.2 Research Motivation
Current approaches to adherence monitoring rely on:
- Patient self-reporting (unreliable, prone to bias)
- Manual pharmacy claim reviews (time-consuming, reactive)
- Post-hospitalization interventions (too late to prevent adverse events)

**Our Solution:** A machine learning-based Clinical Intelligence System that:
- **Predicts adherence risk** using historical pharmacy claims and financial data
- **Provides risk stratification** into 4 clinical tiers (LOW, ELEVATED, HIGH, CRITICAL)
- **Enables proactive interventions** with actionable clinical insights
- **Delivers real-time predictions** via web-based interface
- **Supports clinical decision-making** without replacing human judgment

### 1.3 Research Objectives
1. Develop accurate XGBoost models for diabetes and hypertension adherence prediction
2. Implement strict feature validation and data quality standards
3. Create an intuitive clinical interface for healthcare providers
4. Establish risk-tiered intervention protocols based on confidence levels
5. Provide comprehensive audit trail and PDF export capabilities for clinical documentation

### 1.4 Scope
This report covers the end-to-end implementation of a full-stack web application including:
- **Backend API** with FastAPI and machine learning models
- **Frontend UI** with React and framer-motion animations
- **Database integration** for feature engineering and model serving
- **Clinical risk assessment** engine with confidence-based tiers
- **PDF report generation** for clinical workflows

---

## 2. Requirements Specifications

### 2.1 Functional Requirements

#### 2.1.1 Model Selection and Training
- **Requirement FR1:** System shall support multiple disease models (Diabetes, Hypertension)
- **Requirement FR2:** Each model shall accept exactly 10 numerical features in a fixed order
- **Requirement FR3:** Models shall return binary classification (Adherent=1, Non-Adherent=0)
- **Requirement FR4:** System shall provide probability scores for both classes (predict_proba)
- **Implementation:** XGBoost 3.2.0 binary classifiers trained on balanced datasets with SMOTE

#### 2.1.2 Feature Engineering and Input Validation
- **Requirement FR5:** System shall validate all 10 required features before prediction
- **Requirement FR6:** Missing or malformed features shall trigger HTTP 400 error with detailed message
- **Requirement FR7:** Features shall be scaled using StandardScaler fitted on training data
- **Requirement FR8:** Silent fallback values (e.g., `.get(feature, 0)`) shall be explicitly prohibited
- **Implementation:** `_validate_required_features()` function with explicit error handling

#### 2.1.3 Risk Stratification and Clinical Insights
- **Requirement FR9:** System shall calculate risk tier based on BOTH prediction AND confidence
- **Requirement FR10:** Four distinct risk tiers shall be implemented:
  - ADHERENT (any confidence) → LOW risk
  - NON-ADHERENT (50-75% confidence) → ELEVATED risk
  - NON-ADHERENT (76-90% confidence) → HIGH risk
  - NON-ADHERENT (>90% confidence) → CRITICAL risk
- **Requirement FR11:** Each tier shall provide tier-specific actions and interventions
- **Implementation:** `getRiskTier(prediction, confidence)` function with conditional JSX rendering

#### 2.1.4 User Interface and Interactions
- **Requirement FR12:** UI shall display prediction with large, high-contrast text
- **Requirement FR13:** Donut chart shall visualize class probabilities with center confidence percentage
- **Requirement FR14:** Form inputs shall include sliders and numeric inputs with validation
- **Requirement FR15:** Results shall animate with framer-motion on prediction changes
- **Implementation:** React 18.3.1 with framer-motion 12.38.0, recharts 2.15.4

#### 2.1.5 Clinical Documentation and Export
- **Requirement FR16:** System shall generate PDF reports with clinical summary
- **Requirement FR17:** PDF shall include prediction, probabilities, risk tier, and suggested actions
- **Requirement FR18:** PDF filename shall include model type and prediction outcome
- **Implementation:** jsPDF 2.x with html2canvas integration

### 2.2 Non-Functional Requirements

#### 2.2.1 Performance
- **Requirement NFR1:** API prediction latency shall be <500ms (p99)
- **Requirement NFR2:** Frontend build shall complete in <30 seconds
- **Requirement NFR3:** PDF generation shall complete in <3 seconds
- **Implementation:** Uvicorn async server, Vite 5.4.21 build tool

#### 2.2.2 Reliability and Data Integrity
- **Requirement NFR2:** Models shall use lifespan context manager for startup validation
- **Requirement NFR3:** Feature order shall be preserved exactly as trained
- **Requirement NFR4:** Scaling parameters shall be immutable after model deployment
- **Implementation:** FastAPI lifespan event with pickle serialization

#### 2.2.3 Security and Validation
- **Requirement NFR5:** API shall reject requests with schema violations (HTTP 400)
- **Requirement NFR6:** No silent data modifications or defaults shall be permitted
- **Requirement NFR7:** All numerical inputs shall be type-validated
- **Implementation:** Strict type checking and explicit error messages

#### 2.2.4 Usability
- **Requirement NFR8:** UI shall be responsive (desktop, tablet, mobile)
- **Requirement NFR9:** Form labels shall display database column names for transparency
- **Requirement NFR10:** Live clock shall display current time (1-second updates)
- **Implementation:** Tailwind CSS responsive design, useState hooks for real-time updates

---

## 3. System Design

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Clinical Intelligence System                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              FRONTEND (React/Vite)                        │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  App.jsx (800+ lines)                              │  │  │
│  │  │  - Form inputs with smart sliders                 │  │  │
│  │  │  - Results dashboard with animations              │  │  │
│  │  │  - Risk tier visualization (4 tiers)              │  │  │
│  │  │  - PDF export functionality                        │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  Dependencies:                                            │  │
│  │  - framer-motion (animations)                            │  │
│  │  - lucide-react (clinical icons)                         │  │
│  │  - recharts (donut chart visualization)                  │  │
│  │  - jsPDF + html2canvas (PDF export)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              │ HTTP POST                         │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         BACKEND (FastAPI + Uvicorn)                     │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  app.py (150+ lines)                               │  │  │
│  │  │  - /predict/diabetes endpoint                      │  │  │
│  │  │  - /predict/hypertension endpoint                  │  │  │
│  │  │  - Lifespan context manager                        │  │  │
│  │  │  - Feature validation (_validate_required_...)    │  │  │
│  │  │  - Input scaling (_prepare_scaled_input)           │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ML Pipeline:                                            │  │
│  │  1. Validate features (10 exact keys required)           │  │
│  │  2. Scale inputs (StandardScaler)                        │  │
│  │  3. Predict class (XGBoost.predict)                      │  │
│  │  4. Get probabilities (XGBoost.predict_proba)            │  │
│  │  5. Return JSON response                                 │  │
│  │                                                            │  │
│  │  Models (Pickle files):                                  │  │
│  │  - diabetes_model.pkl (XGBClassifier)                    │  │
│  │  - diabetes_scaler.pkl (StandardScaler)                  │  │
│  │  - diabetes_features.pkl (feature names)                 │  │
│  │  - hypertension_model.pkl (XGBClassifier)                │  │
│  │  - hypertension_scaler.pkl (StandardScaler)              │  │
│  │  - hypertension_features.pkl (feature names)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Database Schema - Feature Definitions

#### 3.2.1 Diabetes Model (10 Features)

| # | Feature Name | Type | Min | Max | Step | Description |
|---|---|---|---|---|---|---|
| 1 | NUM_CLAIMS | int | 0 | ∞ | 1 | Total pharmacy claims in period |
| 2 | CLAIM_IRREGULARITY | float | 0 | 200 | 0.01 | Irregularity score (high = sporadic refills) |
| 3 | TOTAL_PAID_AMT | float | 0 | 1,000,000 | 0.01 | Total insurance paid amount |
| 4 | AVG_PAID_AMT | float | 0 | 200,000 | 0.01 | Average per-claim insurance payment |
| 5 | AVG_CLAIM_AMT | float | 0 | 200,000 | 0.01 | Average claim amount |
| 6 | PAYMENT_RATIO | float | 0 | 10 | 0.01 | Insurance coverage ratio (paid/total) |
| 7 | AVG_UNITS | float | 0 | ∞ | 0.01 | Average medication units per claim |
| 8 | NUM_MEDICATIONS | int | 0 | ∞ | 1 | Number of unique medications |
| 9 | NUM_PROVIDERS | int | 0 | ∞ | 1 | Number of healthcare providers |
| 10 | OUT_OF_POCKET_COST | float | 0 | 200,000 | 0.01 | Total out-of-pocket expenses |

#### 3.2.2 Hypertension Model (10 Features)

| # | Feature Name | Type | Min | Max | Step | Description |
|---|---|---|---|---|---|---|
| 1 | NUM_CLAIMS_first | int | 0 | ∞ | 1 | Initial number of claims |
| 2 | DRUG_NAME_ENC_nunique | int | 0 | ∞ | 1 | Unique drug count |
| 3 | IS_COMBINATION_DRUG_mean | float | 0 | 1 | 0.01 | Frequency of combination drugs |
| 4 | IS_COMBINATION_DRUG_sum | int | 0 | 100 | 1 | Total combination drugs |
| 5 | PAID FROM RISK AMT_sum | float | 0 | 1,000,000 | 0.01 | Risk fund payments |
| 6 | TARIFF_mean | float | 0 | 200,000 | 0.01 | Average consultation fee |
| 7 | DOSAGE_MG_max | float | 0 | 200 | 1 | Maximum drug dosage (mg) |
| 8 | HIGH_AMOUNT_mean | float | 0 | 1 | 0.01 | High-cost claim frequency |
| 9 | UNITS_sum | int | 0 | 5,000 | 1 | Total medication units dispensed |
| 10 | UNITS_std | float | 0 | ∞ | 0.01 | Variation in medication units |

### 3.3 Machine Learning Model Design

#### 3.3.1 Model Type and Configuration
- **Algorithm:** XGBoost 3.2.0 (Gradient Boosting Decision Trees)
- **Task:** Binary Classification
- **Class 0:** Non-Adherent (patient not taking medications consistently)
- **Class 1:** Adherent (patient maintaining medication routine)
- **Output:** `predict()` (class label) + `predict_proba()` (confidence scores)

#### 3.3.2 Training Pipeline
```
Raw Data
  ↓
Feature Engineering (10 key features)
  ↓
Train/Test Split (80/20)
  ↓
Class Imbalance Handling (SMOTE oversampling)
  ↓
StandardScaler Normalization
  ↓
XGBoost Training
  ↓
Model Validation & Serialization
  ↓
Pickle Serialization (model, scaler, features)
```

#### 3.3.3 Feature Scaling (StandardScaler)
```
Formula: scaled_value = (raw_value - mean) / standard_deviation

Example for NUM_CLAIMS:
- Training mean: 15.5
- Training std: 8.2
- Raw patient value: 22
- Scaled value: (22 - 15.5) / 8.2 = 0.79

Purpose:
- Normalize features to comparable scales
- Prevent high-value features from dominating
- Match training data distribution
```

### 3.4 Risk Tier Classification Logic

#### 3.4.1 Risk Tier Decision Tree
```
prediction = model.predict(scaled_features)
confidence = max(probability.class_0, probability.class_1)
confidence_percent = confidence * 100

if prediction == 1:  # ADHERENT
    tier = LOW
    
else:  # prediction == 0, NON-ADHERENT
    if confidence_percent <= 75:
        tier = ELEVATED
    elif confidence_percent <= 90:
        tier = HIGH
    else:  # confidence_percent > 90:
        tier = CRITICAL
```

#### 3.4.2 Risk Tier Specifications

| Tier | Prediction | Confidence | Color | Persona | Intervention Level |
|------|-----------|-----------|-------|---------|---|
| **LOW** | Adherent | Any | Emerald | Consistent Adherer | Maintenance |
| **ELEVATED** | Non-Adherent | 50-75% | Amber | Borderline Risk | Preventive |
| **HIGH** | Non-Adherent | 76-90% | Rose | High-Risk Drop-off | Proactive |
| **CRITICAL** | Non-Adherent | >90% | Red-700 | Critical Disengagement | Urgent |

### 3.5 API Design

#### 3.5.1 Request/Response Contract

**Endpoint:** `POST /predict/diabetes`

**Request Body:**
```json
{
  "NUM_CLAIMS": 11,
  "CLAIM_IRREGULARITY": 19.84,
  "TOTAL_PAID_AMT": 78918.47,
  "AVG_PAID_AMT": 7831.44,
  "AVG_CLAIM_AMT": 8156.24,
  "PAYMENT_RATIO": 1.0,
  "AVG_UNITS": 50.48,
  "NUM_MEDICATIONS": 2,
  "NUM_PROVIDERS": 1,
  "OUT_OF_POCKET_COST": 0
}
```

**Successful Response (HTTP 200):**
```json
{
  "prediction": 0,
  "probability": {
    "class_0": 0.9725,
    "class_1": 0.0275
  },
  "features_used": ["NUM_CLAIMS", "CLAIM_IRREGULARITY", "TOTAL_PAID_AMT", ...]
}
```

**Error Response (HTTP 400):**
```json
{
  "detail": "Missing required features: ['NUM_MEDICATIONS', 'OUT_OF_POCKET_COST']"
}
```

---

## 4. System Implementation

### 4.1 Backend Implementation (FastAPI)

#### 4.1.1 Core Architecture

**File:** `backend/app.py` (~150 lines)

**Key Components:**

1. **Lifespan Context Manager:**
```python
async def lifespan(app: FastAPI):
    # STARTUP: Load models once
    state.diabetes_model = pickle.load(...)
    state.diabetes_scaler = pickle.load(...)
    state.diabetes_features = pickle.load(...)
    state.hypertension_model = pickle.load(...)
    state.hypertension_scaler = pickle.load(...)
    state.hypertension_features = pickle.load(...)
    yield
    # SHUTDOWN: Cleanup (if needed)
```

**Benefits:**
- Models loaded once at startup (not on every request)
- Pickle files immutable after loading
- Feature order preserved exactly

2. **Feature Validation:**
```python
def _validate_required_features(data: dict, required_features: list):
    """
    Rejects request if ANY feature is missing.
    No silent fallbacks like .get(f, 0)
    """
    missing = [f for f in required_features if f not in data]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required features: {missing}"
        )
```

3. **Input Scaling:**
```python
def _prepare_scaled_input(data: dict, required_features: list, scaler):
    """
    1. Extract values in EXACT feature order
    2. Build numpy array [1, 10]
    3. Apply StandardScaler.transform()
    """
    values = [data[f] for f in required_features]
    array = np.array([values])
    scaled = scaler.transform(array)
    return scaled
```

4. **Prediction Endpoints:**
```python
@app.post("/predict/diabetes")
async def predict_diabetes(data: dict):
    _validate_required_features(data, DIABETES_FEATURES)
    scaled_input = _prepare_scaled_input(data, DIABETES_FEATURES, scaler)
    
    pred = model.predict(scaled_input)[0]
    prob = model.predict_proba(scaled_input)[0]
    
    return {
        "prediction": int(pred),
        "probability": {
            "class_0": float(prob[0]),
            "class_1": float(prob[1])
        },
        "features_used": DIABETES_FEATURES
    }
```

#### 4.1.2 Dependencies
- **FastAPI 0.104.1** - Web framework
- **Uvicorn 0.24.0** - ASGI server
- **scikit-learn 1.8.0** - StandardScaler
- **XGBoost 3.2.0** - ML models
- **pickle** - Model serialization
- **Python 3.13.5**

#### 4.1.3 Running the Backend
```bash
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Run Uvicorn server (reload mode for development)
cd backend
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Server runs on http://127.0.0.1:8000
# Docs available at http://127.0.0.1:8000/docs (Swagger UI)
```

### 4.2 Frontend Implementation (React/Vite)

#### 4.2.1 Core Architecture

**File:** `frontend/src/App.jsx` (~850 lines)

**Key Components:**

1. **Model Configuration:**
```javascript
const MODEL_CONFIG = {
  diabetes: {
    title: "Diabetes Model",
    endpoint: "/predict/diabetes",
    features: [
      { key: "NUM_CLAIMS", label: "Total Pharmacy Claims", ... },
      { key: "CLAIM_IRREGULARITY", label: "Pharmacy Visit Irregularity", 
        max: 200, ... },
      // ... 8 more features
    ]
  },
  hypertension: { /* similar structure */ }
}
```

2. **Smart Field Component:**
```javascript
function SmartField({ feature, value, onChange }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium">{feature.label}</p>
      <p className="text-xs font-mono text-slate-400">{feature.key}</p>
      
      <div className="grid gap-3 md:grid-cols-[1fr_110px]">
        {/* Slider Input */}
        <input type="range" ... />
        
        {/* Numeric Input */}
        <input type="number" ... />
      </div>
    </div>
  )
}
```

3. **Risk Tier Logic:**
```javascript
function getRiskTier(prediction, confidence) {
  const confPercent = confidence * 100;
  
  if (prediction === 1) {
    return { status: "LOW", persona: "Consistent Adherer", ... }
  }
  
  if (confPercent <= 75) {
    return { status: "ELEVATED", persona: "Borderline Risk", ... }
  }
  
  if (confPercent <= 90) {
    return { status: "HIGH", persona: "High-Risk Drop-off", ... }
  }
  
  return { status: "CRITICAL", persona: "Critical Disengagement", ... }
}
```

4. **Results Dashboard with Animations:**
```javascript
<motion.div key={`prediction-${prediction}`}
  initial={{ opacity: 0, scale: 0.85 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.55 }}>
  
  <p className={`text-6xl font-extrabold ${careProfile.color}`}>
    {predictionText}
  </p>
</motion.div>

<motion.div key={`pie-${prediction}`}
  initial={{ rotate: -90 }}
  animate={{ rotate: 0 }}
  transition={{ duration: 0.8 }}>
  
  <ResponsiveContainer>
    <PieChart>
      <Pie data={chartData} ... />
    </PieChart>
  </ResponsiveContainer>
</motion.div>
```

5. **PDF Export:**
```javascript
function handleExportPdf() {
  const doc = new jsPDF();
  
  doc.text("Medication Adherence Clinical Report", 44, 52);
  doc.setDrawColor(37, 99, 235);
  doc.line(44, 64, pageWidth - 44, 64);
  
  // Add prediction, risk tier, actions...
  reportLines.forEach(line => {
    doc.text(line, 44, cursorY);
    cursorY += 16;
  });
  
  doc.save(`clinical-report-${model}-${prediction}.pdf`);
}
```

#### 4.2.2 Dependencies
- **React 18.3.1** - UI framework
- **Vite 5.4.21** - Build tool (3320 modules, 16s build time)
- **Tailwind CSS 3.4.14** - Styling
- **framer-motion 12.38.0** - Animations
- **lucide-react 1.11.0** - Clinical icons
- **recharts 2.15.4** - Donut chart
- **jsPDF 2.x + html2canvas** - PDF export
- **Node.js 18+**

#### 4.2.3 Running the Frontend
```bash
cd frontend

# Install dependencies (first time)
npm install

# Development server (hot reload)
npm run dev
# Server runs on http://localhost:5173

# Production build
npm run build
# Output in frontend/dist/
```

#### 4.2.4 UI Layout Structure
```
┌─────────────────────────────────────────────────────┐
│  Header: Clinical Intelligence + Live Time + Export │
├─────────────────────────────────────────────────────┤
│                                                       │
│ ┌──────────────────────┐ ┌──────────────────────┐  │
│ │   Input Form         │ │  Results Dashboard   │  │
│ │ ─────────────────── │ │ ─────────────────── │  │
│ │ Model Selector       │ │ Summary Card        │  │
│ │                      │ │ Prediction Text     │  │
│ │ Clinical Fields      │ │ Donut Chart         │  │
│ │ - NUM_CLAIMS         │ │ Risk Level & Persona│  │
│ │ - IRREGULARITY       │ │ Suggested Actions   │  │
│ │ - ... (5 more)       │ │ (Animated)          │  │
│ │                      │ │                     │  │
│ │ Financial Fields     │ │                     │  │
│ │ - TOTAL_PAID_AMT     │ │                     │  │
│ │ - AVG_PAID_AMT       │ │                     │  │
│ │ - ... (3 more)       │ │                     │  │
│ │                      │ │                     │  │
│ │ [Run Prediction Btn] │ │                     │  │
│ └──────────────────────┘ └──────────────────────┘  │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 5. Testing Documents

### 5.1 Test Case Definitions

#### 5.1.1 Diabetes Model - Test Case 1: Adherent Patient
**Test Name:** HIGH_ENGAGEMENT_ADHERENT

**Input Values:**
```json
{
  "NUM_CLAIMS": 2,
  "CLAIM_IRREGULARITY": 0,
  "TOTAL_PAID_AMT": 8695.85,
  "AVG_PAID_AMT": 4347.925,
  "AVG_CLAIM_AMT": 4347.925,
  "PAYMENT_RATIO": 0.9998850158,
  "AVG_UNITS": 60.5,
  "NUM_MEDICATIONS": 2,
  "NUM_PROVIDERS": 2,
  "OUT_OF_POCKET_COST": 0
}
```

**Expected Output:**
```json
{
  "prediction": 1,
  "probability": {
    "class_0": 0.1990,
    "class_1": 0.8010
  },
  "confidence": 80.1%,
  "risk_tier": "LOW"
}
```

**Clinical Interpretation:**
- Patient shows strong adherence (80.1% confidence)
- Zero claim irregularity indicates regular refills
- Almost perfect insurance coverage ratio
- No out-of-pocket costs
- Recommended Action: Maintain current care plan, standard 6-month follow-up

---

#### 5.1.2 Diabetes Model - Test Case 2: Non-Adherent (Elevated Risk)
**Test Name:** MINIMAL_ENGAGEMENT_ELEVATED

**Input Values:**
```json
{
  "NUM_CLAIMS": 3,
  "CLAIM_IRREGULARITY": 50,
  "TOTAL_PAID_AMT": 10000,
  "AVG_PAID_AMT": 1000,
  "AVG_CLAIM_AMT": 3000,
  "PAYMENT_RATIO": 0.2,
  "AVG_UNITS": 10,
  "NUM_MEDICATIONS": 1,
  "NUM_PROVIDERS": 1,
  "OUT_OF_POCKET_COST": 50000
}
```

**Expected Output:**
```json
{
  "prediction": 0,
  "probability": {
    "class_0": ~0.60,
    "class_1": ~0.40
  },
  "confidence": 60%,
  "risk_tier": "ELEVATED"
}
```

**Clinical Interpretation:**
- Early signs of non-adherence (60% probability)
- High claim irregularity suggests sporadic refills
- Low payment ratio indicates cost barriers
- High out-of-pocket costs (potential compliance issue)
- Recommended Action: Send SMS reminders, review medication schedule

---

#### 5.1.3 Diabetes Model - Test Case 3: Non-Adherent (High Risk)
**Test Name:** DISENGAGED_HIGH_RISK

**Input Values:**
```json
{
  "NUM_CLAIMS": 1,
  "CLAIM_IRREGULARITY": 100,
  "TOTAL_PAID_AMT": 1000,
  "AVG_PAID_AMT": 500,
  "AVG_CLAIM_AMT": 1000,
  "PAYMENT_RATIO": 0.05,
  "AVG_UNITS": 5,
  "NUM_MEDICATIONS": 1,
  "NUM_PROVIDERS": 1,
  "OUT_OF_POCKET_COST": 100000
}
```

**Expected Output:**
```json
{
  "prediction": 0,
  "probability": {
    "class_0": ~0.85,
    "class_1": ~0.15
  },
  "confidence": 85%,
  "risk_tier": "HIGH"
}
```

**Clinical Interpretation:**
- Significant non-adherence signals (85% confidence)
- Minimal claims (1 claim in period)
- Maximum claim irregularity
- Very high out-of-pocket costs
- Recommended Action: Initiate nurse outreach call, review barriers

---

#### 5.1.4 Diabetes Model - Test Case 4: Non-Adherent (Critical)
**Test Name:** ABANDONED_PROTOCOL_CRITICAL

**Input Values:**
```json
{
  "NUM_CLAIMS": 0,
  "CLAIM_IRREGULARITY": 200,
  "TOTAL_PAID_AMT": 0,
  "AVG_PAID_AMT": 0,
  "AVG_CLAIM_AMT": 0,
  "PAYMENT_RATIO": 0,
  "AVG_UNITS": 0,
  "NUM_MEDICATIONS": 1,
  "NUM_PROVIDERS": 1,
  "OUT_OF_POCKET_COST": 200000
}
```

**Expected Output:**
```json
{
  "prediction": 0,
  "probability": {
    "class_0": ~0.98,
    "class_1": ~0.02
  },
  "confidence": 98%,
  "risk_tier": "CRITICAL"
}
```

**Clinical Interpretation:**
- Severe non-adherence (98% confidence)
- Zero pharmacy claims in period
- No medication activity whatsoever
- Extremely high out-of-pocket barrier
- Recommended Action: Immediate care manager intervention, investigate barriers

---

#### 5.1.5 Hypertension Model - Test Case 5: High Engagement
**Test Name:** HYPERTENSION_ADHERENT

**Input Values:**
```json
{
  "NUM_CLAIMS_first": 11,
  "DRUG_NAME_ENC_nunique": 2,
  "IS_COMBINATION_DRUG_mean": 0.5,
  "IS_COMBINATION_DRUG_sum": 5,
  "PAID FROM RISK AMT_sum": 50000,
  "TARIFF_mean": 1000,
  "DOSAGE_MG_max": 160,
  "HIGH_AMOUNT_mean": 0.3,
  "UNITS_sum": 2820,
  "UNITS_std": 100
}
```

**Expected Output:**
```json
{
  "prediction": 1,
  "probability": {
    "class_0": ~0.25,
    "class_1": ~0.75
  },
  "confidence": 75%,
  "risk_tier": "LOW"
}
```

**Clinical Interpretation:**
- Patient demonstrating good adherence
- High number of unique medications suggests active therapy
- Significant risk fund utilization
- High medication units dispensed
- Recommended Action: Maintain current care plan

---

### 5.2 Integration Testing

#### 5.2.1 Backend API Testing
```bash
# Test endpoint availability
curl http://127.0.0.1:8000/docs

# Test prediction endpoint
POST http://127.0.0.1:8000/predict/diabetes
Content-Type: application/json
Body: { "NUM_CLAIMS": 11, "CLAIM_IRREGULARITY": 0, ... }

# Expected: HTTP 200 with prediction JSON
```

#### 5.2.2 Frontend Build Validation
```bash
cd frontend
npm run build

# Expected: "✓ built in X.XXs"
# No errors or warnings
# 3320+ modules transformed
```

#### 5.2.3 End-to-End Flow Testing
1. Open http://localhost:5173 in browser
2. Enter test values from 5.1.1-5.1.5
3. Click "Run Prediction"
4. Verify:
   - Animations play smoothly
   - Prediction text displays correctly
   - Risk tier colors match specification
   - Donut chart renders with confidence percentage
   - PDF export generates valid file
5. Compare output with expected results

---

## 6. Installation Guidelines

### 6.1 System Requirements

#### 6.1.1 Hardware
- **RAM:** Minimum 4GB (recommended 8GB)
- **Disk Space:** 2GB (models + dependencies)
- **Processor:** Intel Core i5 or equivalent

#### 6.1.2 Software
- **Python:** 3.11+ (tested on 3.13.5)
- **Node.js:** 18+ (tested on v18+)
- **npm:** 9+ (comes with Node.js)
- **Git:** For cloning repository

#### 6.1.3 Operating System
- Windows 10/11 (with PowerShell 5.1)
- macOS 11+
- Linux (Ubuntu 20.04+)

---

### 6.2 Installation Steps

#### 6.2.1 Clone Repository
```bash
# Clone the project
git clone <repository-url>
cd "Medication adherence project"

# Verify structure
ls
# Output should show: backend/, frontend/, models/, *.ipynb, *.md
```

#### 6.2.2 Backend Setup

**Step 1: Create Python Virtual Environment**
```bash
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

**Step 2: Install Backend Dependencies**
```bash
# Install from requirements.txt (if exists) or manually
pip install fastapi==0.104.1
pip install uvicorn==0.24.0
pip install scikit-learn==1.8.0
pip install xgboost==3.2.0
pip install python-multipart

# Verify installations
python -c "import fastapi; import xgboost; print('Backend dependencies OK')"
```

**Step 3: Verify Model Files**
```bash
# Check models directory
ls models/

# Should contain:
# - diabetes_model.pkl
# - diabetes_scaler.pkl
# - diabetes_features.pkl
# - hypertension_model.pkl
# - hypertension_scaler.pkl
# - hypertension_features.pkl
```

**Step 4: Start Backend Server**
```bash
cd backend
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Expected output:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
```

#### 6.2.3 Frontend Setup

**Step 1: Navigate to Frontend**
```bash
# In new terminal, from project root
cd frontend
```

**Step 2: Install Frontend Dependencies**
```bash
npm install

# This installs:
# - react 18.3.1
# - vite 5.4.21
# - tailwindcss 3.4.14
# - framer-motion 12.38.0
# - lucide-react 1.11.0
# - recharts 2.15.4
# - jspdf + html2canvas
```

**Step 3: Start Development Server**
```bash
npm run dev

# Expected output:
# VITE v5.4.21  ready in XXX ms
# ➜  Local:   http://localhost:5173/
```

**Step 4: Access Application**
```
Open browser: http://localhost:5173
```

---

### 6.3 Verification Checklist

- [ ] Python 3.11+ installed: `python --version`
- [ ] Node.js 18+ installed: `node --version`
- [ ] Virtual environment activated (shows `(.venv)` in terminal)
- [ ] Backend dependencies installed: `pip list | grep fastapi`
- [ ] Model files present in `models/` directory (6 .pkl files)
- [ ] Backend server running: `http://127.0.0.1:8000/docs` accessible
- [ ] Frontend dependencies installed: `npm list react`
- [ ] Frontend dev server running: `http://localhost:5173` accessible
- [ ] Form displays all fields (10 per model)
- [ ] Prediction runs and returns results
- [ ] PDF export button functional
- [ ] Animations render smoothly

---

### 6.4 Troubleshooting

#### 6.4.1 Backend Issues

**Issue:** "ModuleNotFoundError: No module named 'fastapi'"
```bash
# Solution: Activate venv and reinstall
.\.venv\Scripts\Activate.ps1
pip install fastapi uvicorn
```

**Issue:** "Port 8000 already in use"
```bash
# Solution: Use different port
python -m uvicorn app:app --port 8001

# Update frontend API_BASE if needed:
# const API_BASE = "http://127.0.0.1:8001"
```

**Issue:** "Model file not found: diabetes_model.pkl"
```bash
# Solution: Verify models directory
ls models/
# If missing, run notebook from google colab work/ to regenerate
```

#### 6.4.2 Frontend Issues

**Issue:** "Cannot find module 'react'"
```bash
# Solution: Reinstall node_modules
rm -r node_modules
npm install
```

**Issue:** "Port 5173 already in use"
```bash
# Solution: Vite will auto-increment to 5174
npm run dev
# Will run on http://localhost:5174
```

**Issue:** "Build fails with 'unexpected token'"
```bash
# Solution: Clear cache and rebuild
rm -r dist/
npm run build
```

---

## 7. Conclusion and Future Work

### 7.1 Conclusions

#### 7.1.1 Research Achievements
1. **Developed production-ready ML system** with strict feature validation and error handling
2. **Implemented clinical risk stratification** using confidence-based tiers (4 levels)
3. **Created intuitive user interface** with animations and real-time predictions
4. **Achieved accurate predictions** with XGBoost models trained on real healthcare data
5. **Delivered comprehensive documentation** including prediction logic and risk tiers

#### 7.1.2 Key Technical Contributions
- **Feature validation:** Eliminated silent fallbacks, enforced strict 10-feature schema
- **Risk tier logic:** Transformed binary predictions into 4-level clinical interventions
- **Frontend UX:** Implemented smooth animations, color-coded risk visualization, PDF export
- **Backend architecture:** Lifespan context manager for efficient model loading
- **Data integrity:** Feature order preserved exactly, immutable scaling parameters

#### 7.1.3 System Impact
- **Clinical Utility:** Enables proactive intervention 50-75% confidence patients before critical disengagement
- **Decision Support:** Provides actionable insights based on confidence levels, not binary predictions
- **Documentation:** Automatic PDF reports for clinical workflows
- **Scalability:** Handles multiple disease models with identical architecture

---

### 7.2 Future Work

#### 7.2.1 Model Enhancements
1. **Real-time Model Retraining**
   - Implement continuous learning pipeline
   - Auto-retrain models on new pharmacy claim data
   - Monitor model drift and performance degradation

2. **Multi-Model Ensemble**
   - Combine XGBoost with LightGBM and CatBoost
   - Weighted voting for increased robustness
   - Confidence interval estimation

3. **Feature Importance Analysis**
   - Explain which features drive predictions (SHAP values)
   - Clinician-facing feature impact visualization
   - Identify modifiable risk factors

#### 7.2.2 Clinical Workflow Integration
1. **EHR Integration**
   - Direct HL7/FHIR integration with hospital systems
   - Real-time patient pharmacy updates
   - Automated referral generation to care management

2. **Intervention Platform**
   - SMS/Email notification system for patient reminders
   - Care manager task assignment based on risk tier
   - Outcome tracking (intervention → patient behavior change)

3. **Alerts and Thresholds**
   - Custom alert configurations per healthcare provider
   - Escalation workflows for CRITICAL tier patients
   - Integration with clinical workflows (Epic, Cerner, etc.)

#### 7.2.3 Data Science Enhancements
1. **Extended Feature Engineering**
   - Temporal features (seasonal medication usage patterns)
   - Patient demographics (age, comorbidities)
   - Provider network analysis (specialist coordination)
   - Cost-effectiveness ratios by intervention type

2. **Outcome Prediction**
   - Predict hospitalization risk from adherence status
   - Model healthcare cost impact of interventions
   - ROI calculation for different intervention strategies

3. **Patient Segmentation**
   - Identify distinct patient subpopulations
   - Develop persona-specific interventions
   - Personalized medication adherence coaching

#### 7.2.4 Technical Infrastructure
1. **Database Backend**
   - Replace pickle files with PostgreSQL + TimescaleDB
   - Store historical predictions for audit trail
   - Enable data versioning and rollback

2. **Model Serving**
   - Deploy via Docker containers for portability
   - Kubernetes orchestration for scalability
   - Model versioning and A/B testing framework

3. **Monitoring and Observability**
   - Prometheus metrics for API performance
   - Grafana dashboards for model health
   - DataDog/New Relic for production monitoring

#### 7.2.5 Validation and Regulatory
1. **Clinical Validation**
   - Prospective validation study with healthcare providers
   - Comparison against manual adherence assessment
   - Regulatory approval pathway (FDA 510(k) or De Novo)

2. **Security and Compliance**
   - HIPAA compliance certification
   - GDPR data protection implementation
   - Encrypted data at rest and in transit

3. **Explainability and Trust**
   - Clinician training program for model interpretation
   - User feedback mechanisms
   - Bias and fairness audits

---

### 7.3 Final Recommendations

#### 7.3.1 Immediate Next Steps (0-3 months)
1. Conduct clinical validation study with 100+ patients
2. Implement EHR integration pilot with 1-2 healthcare systems
3. Develop patient SMS notification system
4. Create care manager dashboard for intervention tracking

#### 7.3.2 Short-term (3-6 months)
1. Deploy to production environment with monitoring
2. Integrate with patient-facing mobile app
3. Implement outcome tracking and ROI analysis
4. Submit for regulatory clearance

#### 7.3.3 Long-term (6-12+ months)
1. Expand to additional disease conditions (COPD, CHF, etc.)
2. Develop AI-powered recommendation engine for optimal interventions
3. Build predictive models for medication cost burden
4. Establish national network of healthcare providers using the system

---

### 7.4 Appendix

#### 7.4.1 File Structure
```
Medication adherence project/
├── backend/
│   └── app.py (FastAPI server, prediction endpoints)
├── frontend/
│   ├── src/
│   │   ├── App.jsx (main React component)
│   │   ├── index.css (Tailwind directives)
│   │   └── main.jsx (entry point)
│   ├── package.json (dependencies)
│   ├── vite.config.js (build config)
│   ├── tailwind.config.js (styling config)
│   └── dist/ (production build)
├── models/
│   ├── diabetes_model.pkl
│   ├── diabetes_scaler.pkl
│   ├── diabetes_features.pkl
│   ├── hypertension_model.pkl
│   ├── hypertension_scaler.pkl
│   └── hypertension_features.pkl
├── google colab work/
│   ├── Diabetes Model.ipynb
│   └── Hypertension Model.ipynb
└── *.md (documentation files)
```

#### 7.4.2 References
- [XGBoost Documentation](https://xgboost.readthedocs.io/)
- [FastAPI Official Guide](https://fastapi.tiangolo.com/)
- [React 18 Documentation](https://react.dev/)
- [Tailwind CSS Reference](https://tailwindcss.com/docs)
- [framer-motion Animation Guide](https://www.framer.com/motion/)

---

**Document Version:** 1.0  
**Last Updated:** April 26, 2026  
**Author:** Research Team  
**Status:** Final Report
