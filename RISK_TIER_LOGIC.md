# Tiered Risk Assessment Logic

## Overview
The Results Dashboard now displays contextual risk tiers based on **both the prediction outcome AND the confidence percentage**. This prevents patients with 51% non-adherence probability from receiving the same severe warnings as those with 99% probability.

---

## Risk Tier Definitions

### **Tier 1: ADHERENT (Any Confidence Level)**
**Triggers when:** `prediction = 1` (model predicts Adherent)

| Attribute | Value |
|-----------|-------|
| **Risk Level** | LOW |
| **Color** | Emerald (#16a34a) |
| **Persona** | Consistent Adherer |
| **Summary** | Strong adherence pattern. Consistency in medication refills suggests the current care plan is highly effective. |
| **Suggested Actions** | • Maintain current care plan<br>• Standard 6-month follow-up |

---

### **Tier 2: ELEVATED (51-75% Non-Adherence Confidence)**
**Triggers when:** `prediction = 0` AND `confidence <= 75%`

| Attribute | Value |
|-----------|-------|
| **Risk Level** | ELEVATED |
| **Color** | Amber (#d97706) |
| **Persona** | Borderline Risk |
| **Summary** | Patient is showing early signs of missing refills. Light intervention is recommended to prevent full disengagement. |
| **Suggested Actions** | • Send automated refill reminder SMS<br>• Review medication schedule at next regular visit |

---

### **Tier 3: HIGH (76-90% Non-Adherence Confidence)**
**Triggers when:** `prediction = 0` AND `76% <= confidence <= 90%`

| Attribute | Value |
|-----------|-------|
| **Risk Level** | HIGH |
| **Color** | Rose (#e11d48) |
| **Persona** | High-Risk Drop-off |
| **Summary** | Significant gaps in pharmacy claims detected. Proactive clinical outreach is required. |
| **Suggested Actions** | • Initiate nurse outreach call<br>• Review out-of-pocket costs and alternative coverage |

---

### **Tier 4: CRITICAL (>90% Non-Adherence Confidence)**
**Triggers when:** `prediction = 0` AND `confidence > 90%`

| Attribute | Value |
|-----------|-------|
| **Risk Level** | CRITICAL |
| **Color** | Red-700 (#b91c1c) - Bold/darker |
| **Persona** | Critical Disengagement |
| **Summary** | Severe non-adherence detected. Patient is highly likely to have completely abandoned their medication protocol. |
| **Suggested Actions** | • Immediate care manager intervention<br>• Investigate critical barriers to access (financial/transportation) |

---

## How Confidence is Calculated

```javascript
// For ADHERENT predictions (class_1):
confidence = probability.class_1

// For NON-ADHERENT predictions (class_0):
confidence = probability.class_0
```

**Example:**
- Model returns: `{prediction: 0, probability: {class_0: 0.63, class_1: 0.37}}`
- Interpretation: Non-Adherent with 63% confidence
- **Tier Assignment:** ELEVATED (50% < 63% ≤ 75%)

---

## Visual Display in UI

### Patient Insights & Persona Card Updates:
- **Risk Level text** changes color dynamically (emerald → amber → rose → red)
- **Persona name** reflects the tier classification
- **Suggested Actions** are tier-specific and tailored to intervention intensity
- **Prediction banner** (large "Adherent"/"Non-Adherent" text) changes background color to match tier

### Color Palette:
| Tier | Background | Text |
|------|-----------|------|
| LOW (Emerald) | `bg-emerald-50` | `text-emerald-600` |
| ELEVATED (Amber) | `bg-amber-50` | `text-amber-600` |
| HIGH (Rose) | `bg-rose-50` | `text-rose-600` |
| CRITICAL (Red) | `bg-red-50` | `text-red-700` |

---

## Implementation Details

### Core Function: `getRiskTier(prediction, confidence)`
Located in `frontend/src/App.jsx`

```javascript
function getRiskTier(prediction, confidence) {
  const confidencePercent = confidence * 100; // Convert 0-1 to 0-100

  if (prediction === 1) {
    return { status: "LOW", persona: "Consistent Adherer", accent: "emerald", ... }
  }

  if (confidencePercent <= 75) {
    return { status: "ELEVATED", persona: "Borderline Risk", accent: "amber", ... }
  }

  if (confidencePercent <= 90) {
    return { status: "HIGH", persona: "High-Risk Drop-off", accent: "rose", ... }
  }

  // confidence > 90%
  return { status: "CRITICAL", persona: "Critical Disengagement", accent: "red", ... }
}
```

### Dependencies:
- `getCareProfile(prediction, confidence)` - wraps getRiskTier()
- Dynamic JSX color mapping - uses `careProfile.accent` to select Tailwind classes
- No backend changes required - logic is purely frontend-side

---

## Clinical Rationale

**Why this tiering?**
1. **50-75% confidence:** Early warning - patient shows borderline patterns, minimal intervention may prevent escalation
2. **76-90% confidence:** Moderate risk - clear disengagement signals warrant proactive outreach
3. **>90% confidence:** Severe risk - high certainty of non-adherence requires immediate care management
4. **Adherent:** Always LOW - regardless of confidence %, if model predicts adherent, current plan is working

---

## Testing the Tiers

### Test Case 1: ELEVATED Risk
Input values that produce ~60% non-adherence confidence:
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
Expected: **ELEVATED** (amber) tier, persona "Borderline Risk"

### Test Case 2: HIGH Risk
Input values that produce ~85% non-adherence confidence:
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
Expected: **HIGH** (rose) tier, persona "High-Risk Drop-off"

### Test Case 3: CRITICAL Risk
Input values that produce ~97% non-adherence confidence:
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
Expected: **CRITICAL** (red-700) tier, persona "Critical Disengagement"

---

## Files Modified
- `frontend/src/App.jsx` - Added `getRiskTier()` function, updated `getCareProfile()` signature, dynamic color JSX
- Build: ✅ Pass (npm run build successful)
