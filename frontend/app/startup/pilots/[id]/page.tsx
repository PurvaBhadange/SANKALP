"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCookie } from "cookies-next";
import { 
  ArrowLeft, Building2, CheckCircle2, Clock, FileText, 
  AlertTriangle, Loader2, Play, BarChart3, Plus
} from "lucide-react";

export default function StartupPilotKPIPage() {
  const { id } = useParams();
  const [pilot, setPilot] = useState<any>(null);
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpiSuccess, setKpiSuccess] = useState<string | null>(null);
  const [kpiError, setKpiError] = useState<string | null>(null);

  // Recording measurement form modal
  const [measuringKpiId, setMeasuringKpiId] = useState<string | null>(null);
  const [measuredVal, setMeasuredVal] = useState("");
  const [measuredRemarks, setMeasuredRemarks] = useState("");
  const [measuredEvidence, setMeasuredEvidence] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setKpiError(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      // 1. Fetch pilot details
      const pilotRes = await fetch(`${apiUrl}/pilots/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (pilotRes.ok) {
        setPilot(await pilotRes.json());
      } else {
        const err = await pilotRes.json().catch(() => ({}));
        setKpiError(err.detail || "Failed to load pilot project.");
        setLoading(false);
        return;
      }

      // 2. Fetch KPIs
      const kpisRes = await fetch(`${apiUrl}/pilots/${id}/kpis`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (kpisRes.ok) {
        setKpis(await kpisRes.json());
      }
    } catch (e) {
      setKpiError("Network error loading pilot metrics workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleRecordMeasurement = async () => {
    if (!measuringKpiId || !measuredVal) return;
    setKpiError(null);
    setKpiSuccess(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/pilot_kpis/${measuringKpiId}/measurements`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          measured_value: parseFloat(measuredVal),
          evidence_document_id: measuredEvidence || null,
          remarks: measuredRemarks || null
        })
      });
      if (res.ok) {
        setKpiSuccess("Measurement recorded successfully! Updated progress bar reflects new data.");
        setMeasuringKpiId(null);
        setMeasuredVal("");
        setMeasuredRemarks("");
        setMeasuredEvidence("");
        // Reload data
        const kpisRes = await fetch(`${apiUrl}/pilots/${id}/kpis`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (kpisRes.ok) {
          setKpis(await kpisRes.json());
        }
      } else {
        const err = await res.json();
        setKpiError(err.detail || "Failed to submit KPI metric.");
      }
    } catch (e) {
      setKpiError("Network error submitting measurement.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Header Banner */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/startup/pilots"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Startup Pilot KPI Workspace</h1>
              <p className="text-xs text-slate-400">
                {pilot?.application?.challenge?.title || "Pilot Project performance tracking"}
              </p>
            </div>
          </div>

          {pilot && (
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20`}>
                Status: {pilot.status}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-6">
        {kpiError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{kpiError}</span>
          </div>
        )}

        {kpiSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{kpiSuccess}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm">Loading performance metrics...</p>
          </div>
        ) : !pilot ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-slate-800">
            <h3 className="text-base font-bold text-white">Pilot Project Not Found</h3>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pilot Summary Card */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 bg-slate-900/40">
              <h3 className="text-base font-bold text-white mb-4">Pilot Reference Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Start Date</span>
                  <span className="text-white font-mono">{pilot.start_date || "TBD"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px]">End Date</span>
                  <span className="text-white font-mono">{pilot.end_date || "TBD"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Total Budget</span>
                  <span className="text-white font-mono">₹{pilot.budget ? Number(pilot.budget).toLocaleString() : "TBD"}</span>
                </div>
              </div>
            </div>

            {/* KPIs List */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Key Performance Indicators (KPIs)
              </h3>

              {kpis.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-500 italic">No KPIs have been configured for this pilot yet by the officer.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {kpis.map((kpi) => {
                    const progress = kpi.progress_percentage;
                    const hasProgress = progress !== null && progress !== undefined;
                    const latestVal = kpi.measurements?.length > 0 ? kpi.measurements[kpi.measurements.length - 1].measured_value : null;

                    return (
                      <div key={kpi.id} className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-white text-sm">{kpi.kpi_name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">{kpi.description || "No description provided."}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] uppercase font-bold tracking-wider font-mono">
                            {kpi.measurement_frequency}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs border-t border-b border-slate-800/50 py-2.5">
                          <div>
                            <span className="text-slate-500 text-[10px] block">BASELINE</span>
                            <span className="font-mono text-white">{kpi.baseline_value !== null ? `${kpi.baseline_value} ${kpi.unit}` : "Not Set"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block">TARGET VALUE ({kpi.target_direction})</span>
                            <span className="font-mono text-white">{kpi.target_value !== null ? `${kpi.target_value} ${kpi.unit}` : "Not Set"}</span>
                          </div>
                          <div className="flex justify-between items-center md:justify-end gap-3">
                            <div>
                              <span className="text-slate-500 text-[10px] block text-left md:text-right">LATEST MEASURED</span>
                              <span className="font-mono text-indigo-400 font-bold">{latestVal !== null ? `${latestVal} ${kpi.unit}` : "No Data"}</span>
                            </div>
                            <button
                              onClick={() => setMeasuringKpiId(kpi.id)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Record
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Target Achievement Progress</span>
                            <span className="font-bold font-mono text-white">{hasProgress ? `${progress}%` : kpi.reason || "Missing configuration / metrics"}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${hasProgress ? progress : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Record KPI Measurement Modal */}
      {measuringKpiId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-md w-full rounded-2xl p-6 space-y-4 border border-slate-700 shadow-2xl">
            <h3 className="text-base font-bold text-white">Record KPI Actual Metric</h3>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Measured Value</label>
              <input
                type="number"
                value={measuredVal}
                onChange={(e) => setMeasuredVal(e.target.value)}
                placeholder="e.g. 35.5"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Evidence Document UUID (Optional)</label>
              <input
                type="text"
                value={measuredEvidence}
                onChange={(e) => setMeasuredEvidence(e.target.value)}
                placeholder="UUID"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Remarks (Optional)</label>
              <textarea
                value={measuredRemarks}
                onChange={(e) => setMeasuredRemarks(e.target.value)}
                placeholder="Remarks, caveats or description..."
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setMeasuringKpiId(null)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancel</button>
              <button onClick={handleRecordMeasurement} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl">Record Measurement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
