import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Download,
  FileText,
  ShieldCheck,
  Sparkles,
  User,
  CheckCircle2,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Use environment variable if available, otherwise use production backend
const API_BASE = import.meta.env.VITE_API_URL ? 
  import.meta.env.VITE_API_URL : 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? 'https://medication-adherence-project-production-b322.up.railway.app'
    : 'http://localhost:8000');

const MODEL_CONFIG = {
  diabetes: {
    title: "Diabetes Model",
    endpoint: "/predict/diabetes",
    features: [
      { key: "NUM_CLAIMS", label: "Total Pharmacy Claims", min: 0, step: 1, defaultValue: 11, group: "Claims & Usage" },
      { key: "CLAIM_IRREGULARITY", label: "Pharmacy Visit Irregularity (Score)", min: 0, step: 0.01, defaultValue: 19.84, max: 200, group: "Claims & Usage" },
      { key: "TOTAL_PAID_AMT", label: "Total Amount Paid", min: 0, step: 0.01, defaultValue: 78918.47, max: 1000000, group: "Financial & Cost Data" },
      { key: "AVG_PAID_AMT", label: "Average Amount Paid per Claim", min: 0, step: 0.01, defaultValue: 7831.44, max: 200000, group: "Financial & Cost Data" },
      { key: "AVG_CLAIM_AMT", label: "Average Claim Amount", min: 0, step: 0.01, defaultValue: 8156.24, max: 200000, group: "Financial & Cost Data" },
      { key: "PAYMENT_RATIO", label: "Insurance Payment Coverage Ratio", min: 0, step: 0.01, defaultValue: 1, max: 10, group: "Financial & Cost Data" },
      { key: "AVG_UNITS", label: "Average Medication Units per Claim", min: 0, step: 0.01, defaultValue: 50.48, group: "Claims & Usage" },
      { key: "NUM_MEDICATIONS", label: "Number of Unique Medications", min: 0, step: 1, defaultValue: 2, group: "Claims & Usage" },
      { key: "NUM_PROVIDERS", label: "Number of Healthcare Providers", min: 0, step: 1, defaultValue: 1, group: "Claims & Usage" },
      { key: "OUT_OF_POCKET_COST", label: "Total Out-of-Pocket Cost", min: 0, step: 0.01, defaultValue: 0, max: 200000, group: "Financial & Cost Data" }
    ]
  },
  hypertension: {
    title: "Hypertension Model",
    endpoint: "/predict/hypertension",
    features: [
      { key: "NUM_CLAIMS_first", label: "Initial Number of Claims", min: 0, step: 1, defaultValue: 11, group: "Claims & Usage" },
      { key: "DRUG_NAME_ENC_nunique", label: "Number of Unique Drugs Prescribed", min: 0, step: 1, defaultValue: 2, group: "Claims & Usage" },
      { key: "IS_COMBINATION_DRUG_mean", label: "Frequency of Combination Drugs", min: 0, step: 0.01, defaultValue: 0, group: "Claims & Usage" },
      { key: "IS_COMBINATION_DRUG_sum", label: "Total Combination Drugs Prescribed", min: 0, step: 1, defaultValue: 0, max: 100, group: "Financial & Cost Data" },
      { key: "PAID FROM RISK AMT_sum", label: "Total Amount Paid by Risk Fund", min: 0, step: 0.01, defaultValue: 35226.74, max: 1000000, group: "Financial & Cost Data" },
      { key: "TARIFF_mean", label: "Average Consultation Fee / Tariff", min: 0, step: 0.01, defaultValue: 3316.23, max: 200000, group: "Financial & Cost Data" },
      { key: "DOSAGE_MG_max", label: "Maximum Drug Dosage (mg)", min: 0, step: 1, defaultValue: 50, max: 200, group: "Financial & Cost Data" },
      { key: "HIGH_AMOUNT_mean", label: "Frequency of High-Cost Claims", min: 0, step: 0.01, defaultValue: 0.5, group: "Financial & Cost Data" },
      { key: "UNITS_sum", label: "Total Medication Units Dispensed", min: 0, step: 1, defaultValue: 356, max: 5000, group: "Claims & Usage" },
      { key: "UNITS_std", label: "Variation in Medication Units", min: 0, step: 0.01, defaultValue: 6.12, group: "Claims & Usage" }
    ]
  }
};

const getChartColors = (prediction) => {
  if (prediction === 1) {
    return {
      adherent: "#16a34a",
      nonAdherent: "#e5e7eb"
    };
  }
  return {
    adherent: "#dc2626",
    nonAdherent: "#e5e7eb"
  };
};

function initializeFormValues(model) {
  return MODEL_CONFIG[model].features.reduce((acc, feature) => {
    acc[feature.key] = String(feature.defaultValue);
    return acc;
  }, {});
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatPercent(value) {
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatLiveTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(date);
}

function getSliderMax(feature) {
  if (feature.max !== undefined) {
    return feature.max;
  }
  const base = Number(feature.defaultValue) || 0;
  const scaled = base > 1000 ? base * 1.5 : base * 3;
  return Math.max(feature.min + 100, scaled, 25);
}

function getRiskTier(prediction, confidence) {
  // Convert confidence from decimal (0-1) to percentage (0-100)
  const confidencePercent = confidence * 100;

  if (prediction === 1) {
    // ADHERENT - always LOW risk regardless of confidence
    return {
      status: "LOW",
      persona: "Consistent Adherer",
      accent: "emerald",
      icon: CheckCircle2,
      summary: "Strong adherence pattern. Consistency in medication refills suggests the current care plan is highly effective.",
      actions: ["Maintain current care plan", "Standard 6-month follow-up"]
    };
  }

  // NON-ADHERENT - tier by confidence level
  if (confidencePercent <= 75) {
    return {
      status: "ELEVATED",
      persona: "Borderline Risk",
      accent: "amber",
      icon: AlertTriangle,
      summary: "Patient is showing early signs of missing refills. Light intervention is recommended to prevent full disengagement.",
      actions: ["Send automated refill reminder SMS", "Review medication schedule at next regular visit"]
    };
  }

  if (confidencePercent <= 90) {
    return {
      status: "HIGH",
      persona: "High-Risk Drop-off",
      accent: "rose",
      icon: AlertTriangle,
      summary: "Significant gaps in pharmacy claims detected. Proactive clinical outreach is required.",
      actions: ["Initiate nurse outreach call", "Review out-of-pocket costs and alternative coverage"]
    };
  }

  // CRITICAL - confidence > 90%
  return {
    status: "CRITICAL",
    persona: "Critical Disengagement",
    accent: "red",
    icon: AlertTriangle,
    summary: "Severe non-adherence detected. Patient is highly likely to have completely abandoned their medication protocol.",
    actions: ["Immediate care manager intervention", "Investigate critical barriers to access (financial/transportation)"]
  };
}

function getCareProfile(prediction, confidence) {
  return getRiskTier(prediction, confidence);
}

function getSummary(prediction, model, adherentProbability) {
  const modelName = model === "diabetes" ? "diabetes" : "hypertension";

  if (prediction === 1) {
    return `The current ${modelName} adherence profile looks stable, with an estimated adherence probability of ${formatPercent(adherentProbability)}. Continue medication routines and regular follow-up to maintain this positive trajectory.`;
  }

  return `The model indicates a possible non-adherence risk pattern for ${modelName}, with adherence estimated at ${formatPercent(adherentProbability)}. A closer follow-up plan, refill reminders, and early counseling may help improve consistency.`;
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex min-h-[480px] flex-col items-center justify-center rounded-3xl border border-white/70 bg-white/80 p-10 text-center shadow-2xl shadow-blue-900/5 backdrop-blur"
    >
      <div className="relative mb-8 flex items-center justify-center">
        <Activity className="h-28 w-28 text-blue-200" strokeWidth={1.2} />
        <ShieldCheck className="absolute -bottom-2 -right-3 h-12 w-12 text-blue-700" strokeWidth={1.5} />
      </div>
      <h3 className="text-3xl font-bold text-slate-900">Ready for Prediction</h3>
      <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
        Fill in the patient data above and click "Run Prediction" to see instant adherence insights.
      </p>
    </motion.div>
  );
}

function SmartField({ feature, value, onChange }) {
  const sliderMax = getSliderMax(feature);
  const sliderValue = Number(value || 0);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500">{feature.label}</p>
        <p className="text-xs text-slate-400 font-mono">{feature.key}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px] md:items-center">
        <input
          type="range"
          min={feature.min}
          max={sliderMax}
          step={feature.step}
          value={sliderValue}
          onChange={(event) => onChange(feature.key, event.target.value)}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
          aria-label={`${feature.label} slider`}
        />
        <input
          type="number"
          inputMode="decimal"
          min={feature.min}
          max={sliderMax}
          step={feature.step}
          value={value}
          onChange={(event) => onChange(feature.key, event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
    </div>
  );
}

export default function App() {
  const [activeModel, setActiveModel] = useState("diabetes");
  const [formValues, setFormValues] = useState(() => initializeFormValues("diabetes"));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [liveTime, setLiveTime] = useState(() => new Date());


  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const config = MODEL_CONFIG[activeModel];

  const adherenceProbability = toNumber(result?.probability?.class_1);
  const nonAdherenceProbability = toNumber(result?.probability?.class_0);
  const prediction = result?.prediction;
  const confidence = prediction === 1 ? adherenceProbability : nonAdherenceProbability;
  const careProfile = getCareProfile(prediction, confidence);

  const chartData = useMemo(() => {
    if (!result?.probability) {
      return [];
    }

    const adherent = toNumber(result.probability.class_1);
    const nonAdherent = toNumber(result.probability.class_0);
    const colors = getChartColors(prediction);

    return [
      { name: "Adherent", value: adherent, color: colors.adherent },
      { name: "Non-Adherent", value: nonAdherent, color: colors.nonAdherent }
    ];
  }, [result, prediction]);

  const predictionText = prediction === 1 ? "Adherent" : "Non-Adherent";
  const ResultIcon = careProfile.icon;

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const url = `${API_BASE}${config.endpoint}`;
      console.log('API_BASE:', API_BASE);
      console.log('Full URL:', url);
      
      const payload = config.features.reduce((acc, feature) => {
        acc[feature.key] = toNumber(formValues[feature.key]);
        return acc;
      }, {});

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult({
        prediction: data?.prediction,
        probability: data?.probability ?? { class_0: 0, class_1: 0 },
        featuresUsed: data?.features_used ?? []
      });
    } catch {
      setError("Unable to reach the API. Please check if the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function handleExportPdf() {
    if (!result) {
      setError("Run a prediction first, then export the report.");
      return;
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 44;
    const contentWidth = pageWidth - marginX * 2;
    const startY = 52;
    const predictionLabel = prediction === 1 ? "Adherent" : "Non-Adherent";
    const reportLines = [
      `Patient ID: #MRN-8492`,
      `Current Time: ${formatLiveTime(liveTime)}`,
      `Model: ${config.title}`,
      `Prediction: ${predictionLabel}`,
      `Confidence: ${formatPercent(confidence)}`,
      `Adherence Probability: ${formatPercent(adherenceProbability)}`,
      `Non-Adherence Probability: ${formatPercent(nonAdherenceProbability)}`,
      ``,
      `Clinical Insights`,
      getSummary(prediction, activeModel, adherenceProbability),
      ``,
      `Patient Insights & Persona`,
      `Risk Level: ${careProfile.status}`,
      `Persona: ${careProfile.persona}`,
      `Suggested Actions:`,
      ...careProfile.actions.map((action) => `- ${action}`)
    ];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Medication Adherence Clinical Report", marginX, startY);

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1.4);
    doc.line(marginX, startY + 12, pageWidth - marginX, startY + 12);

    let cursorY = startY + 34;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);

    reportLines.forEach((line) => {
      if (line === "") {
        cursorY += 8;
        return;
      }

      const lines = doc.splitTextToSize(line, contentWidth);
      doc.text(lines, marginX, cursorY);
      cursorY += lines.length * 16;
    });

    doc.save(`clinical-report-${activeModel}-${predictionLabel.toLowerCase()}.pdf`);
  }

  function handleModelChange(model) {
    setActiveModel(model);
    setFormValues(initializeFormValues(model));
    setResult(null);
    setError("");
  }

  function handleInputChange(featureKey, value) {
    setFormValues((current) => ({
      ...current,
      [featureKey]: value
    }));
  }

  const groupedFeatures = useMemo(() => {
    const groups = {};
    config.features.forEach((feature) => {
      if (!groups[feature.group]) {
        groups[feature.group] = [];
      }
      groups[feature.group].push(feature);
    });
    return groups;
  }, [config]);

  const clinicalFeatures = groupedFeatures["Claims & Usage"] ?? [];
  const financialFeatures = groupedFeatures["Financial & Cost Data"] ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-100 to-slate-50 text-slate-800">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-indigo-100/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-slate-100/40 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-12 rounded-3xl bg-white px-5 py-4 shadow-2xl shadow-blue-900/5 lg:px-7 lg:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/10">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Medication Adherence Predictor
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                  Clinical Intelligence
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="rounded-full bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  <Clock3 className="h-3.5 w-3.5 text-blue-600" />
                  Current Time
                </div>
                <div className="mt-0.5 text-xs font-semibold text-slate-600">{formatLiveTime(liveTime)}</div>
              </div>

              <button
                type="button"
                onClick={handleExportPdf}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                <Download className="h-4 w-4" />
                Export PDF Report
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-12 xl:grid-cols-[1.08fr_0.92fr]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/5 lg:p-8"
          >
            <div className="mb-10 flex flex-wrap items-center gap-3 rounded-3xl bg-slate-50/80 p-2">
              {["diabetes", "hypertension"].map((model) => {
                const isActive = model === activeModel;
                return (
                  <button
                    key={model}
                    type="button"
                    onClick={() => handleModelChange(model)}
                    className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-200 md:flex-none md:px-5 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/20"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {MODEL_CONFIG[model].title}
                  </button>
                );
              })}
            </div>

            <div className="mb-10">
              <h2 className="text-lg font-bold tracking-tight text-slate-950">{config.title}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-12">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-700">Clinical & Usage History</h3>
                </div>
                <div className="grid gap-8 lg:grid-cols-2">
                  {clinicalFeatures.map((feature) => (
                    <SmartField
                      key={feature.key}
                      feature={feature}
                      value={formValues[feature.key]}
                      onChange={handleInputChange}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-700">Financial & Cost Data</h3>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                  {financialFeatures.map((feature) => (
                    <SmartField
                      key={feature.key}
                      feature={feature}
                      value={formValues[feature.key]}
                      onChange={handleInputChange}
                    />
                  ))}
                </div>
              </div>

              {error ? <div className="rounded-3xl bg-rose-50 px-6 py-4 text-sm font-semibold text-rose-700">{error}</div> : null}

              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full overflow-hidden rounded-3xl px-6 py-5 text-base font-black text-white shadow-2xl shadow-blue-600/20 transition-all duration-300 ${
                  loading
                    ? "cursor-not-allowed bg-slate-400"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5 hover:shadow-blue-600/30 active:translate-y-0"
                }`}
              >
                <span className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative inline-flex items-center gap-2">
                  <Activity className="h-5 w-5 animate-pulse" />
                  {loading ? "Running Prediction..." : "Run Prediction"}
                </span>
              </button>
            </form>
          </motion.section>

          <section className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/5 lg:p-8">
              {!result ? (
                <EmptyState />
              ) : (
                <div className="space-y-6">
                  <motion.div
                    key={`${prediction}-${activeModel}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-3xl bg-slate-50 px-5 py-4"
                  >
                    <p className="text-sm leading-6 text-slate-600">
                      {getSummary(prediction, activeModel, adherenceProbability)}
                    </p>
                  </motion.div>

                  <motion.div
                    key={`${prediction}-${activeModel}`}
                    initial={{ opacity: 0, scale: 0.85, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    className={`rounded-3xl px-6 py-6 ${
                      careProfile.accent === "emerald"
                        ? "bg-emerald-50"
                        : careProfile.accent === "amber"
                        ? "bg-amber-50"
                        : careProfile.accent === "rose"
                        ? "bg-rose-50"
                        : "bg-red-50"
                    }`}
                  >
                    <p
                      className={`text-5xl font-extrabold tracking-tight md:text-6xl ${
                        careProfile.accent === "emerald"
                          ? "text-emerald-600"
                          : careProfile.accent === "amber"
                          ? "text-amber-600"
                          : careProfile.accent === "rose"
                          ? "text-rose-600"
                          : "text-red-700"
                      }`}
                    >
                      {predictionText}
                    </p>
                  </motion.div>

                  <motion.div
                    key={`pie-${prediction}-${confidence}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="rounded-3xl bg-white p-0"
                  >
                    <div className="relative mx-auto h-[320px] w-full max-w-[380px]">
                      <motion.div
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        className="h-full w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={92}
                              outerRadius={132}
                              paddingAngle={4}
                              stroke="none"
                            >
                              {chartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name) => [`${(Number(value) * 100).toFixed(2)}%`, name]}
                              contentStyle={{
                                borderRadius: 16,
                                border: "1px solid #e2e8f0",
                                background: "#ffffff",
                                boxShadow: "0 24px 48px rgba(15, 23, 42, 0.12)"
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Confidence</p>
                        <p className="mt-2 text-3xl font-extrabold text-slate-950">{formatPercent(confidence)}</p>
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.div
                    key={`actions-${prediction}-${activeModel}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.2 }}
                    className="rounded-3xl bg-slate-50 p-5"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.35 }}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Risk Level</p>
                        <p
                          className={`mt-2 text-lg font-semibold ${
                            careProfile.accent === "emerald"
                              ? "text-emerald-600"
                              : careProfile.accent === "amber"
                              ? "text-amber-600"
                              : careProfile.accent === "rose"
                              ? "text-rose-600"
                              : "text-red-700"
                          }`}
                        >
                          {careProfile.status}
                        </p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.35 }}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Persona</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{careProfile.persona}</p>
                      </motion.div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Suggested Actions</p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                        {careProfile.actions.map((action, index) => (
                          <motion.li
                            key={action}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.4 + index * 0.08 }}
                          >
                            {action}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
