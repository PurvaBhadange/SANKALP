"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCookie } from "cookies-next";
import { 
  ArrowLeft, Building2, CheckCircle2, Clock, FileText, 
  AlertTriangle, Loader2, Play, BarChart3, Plus
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

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
    const token = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
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
    const token = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/pilots/kpis/${measuringKpiId}/measurements`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          measured_value: parseFloat(measuredVal),
          remarks: measuredRemarks || null,
          evidence_document_id: measuredEvidence || null
        })
      });
      if (res.ok) {
        setKpiSuccess("Metric measurement recorded successfully!");
        setMeasuringKpiId(null);
        setMeasuredVal("");
        setMeasuredRemarks("");
        setMeasuredEvidence("");
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setKpiError(err.detail || "Failed to record KPI measurement.");
      }
    } catch (e) {
      setKpiError("Network error recording measurement.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 pb-16 font-sans bg-halftone">
      <Navbar />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* Header Section */}
        <div className="border-b-4 border-black pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/startup/pilots"
              className="p-2 rounded-xl bg-white border-2 border-black text-black hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000] transition-all"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3px]" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight font-display uppercase">Startup Pilot KPI Workspace</h1>
              <p className="text-xs text-black font-bold font-mono mt-0.5 uppercase">
                {pilot?.application?.challenge?.title || "Pilot Project performance tracking"}
              </p>
            </div>
          </div>

          {pilot && (
            <div className="flex items-center gap-3">
              <span className="status-pill status-published font-mono">
                Status: {pilot.status}
              </span>
            </div>
          )}
        </div>

        {kpiError && (
          <div className="p-4 bg-[#FF6B6B] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 stroke-[3px]" />
            <span>{kpiError}</span>
          </div>
        )}

        {kpiSuccess && (
          <div className="p-4 bg-[#86EFAC] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 stroke-[3px]" />
            <span>{kpiSuccess}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-black gap-3 font-mono font-black">
            <Loader2 className="w-10 h-10 animate-spin text-black stroke-[3px]" />
            <p className="text-xs uppercase">Loading performance metrics...</p>
          </div>
        ) : !pilot ? (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-12 text-center">
            <h3 className="text-base font-black text-black uppercase font-display">Pilot Project Not Found</h3>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pilot Summary Card */}
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000] space-y-3">
              <h3 className="text-base font-black text-black uppercase font-display">Pilot Reference Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="bg-[#FFFDF5] p-3 border-2 border-black">
                  <span className="text-black block uppercase font-bold text-[10px]">Start Date</span>
                  <span className="text-black font-black">{pilot.start_date || "TBD"}</span>
                </div>
                <div className="bg-[#FFFDF5] p-3 border-2 border-black">
                  <span className="text-black block uppercase font-bold text-[10px]">End Date</span>
                  <span className="text-black font-black">{pilot.end_date || "TBD"}</span>
                </div>
                <div className="bg-[#FFFDF5] p-3 border-2 border-black">
                  <span className="text-black block uppercase font-bold text-[10px]">Total Budget</span>
                  <span className="text-black font-black bg-[#86EFAC] px-1 border border-black inline-block mt-0.5">₹{pilot.budget ? Number(pilot.budget).toLocaleString() : "TBD"}</span>
                </div>
              </div>
            </div>

            {/* KPIs List */}
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000] space-y-6">
              <h3 className="text-base font-black text-black uppercase font-display flex items-center gap-2 border-b-2 border-black pb-3">
                <BarChart3 className="w-5 h-5 text-black stroke-[3px]" />
                Key Performance Indicators (KPIs)
              </h3>

              {kpis.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-black font-bold uppercase italic">No KPIs have been configured for this pilot yet by the officer.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {kpis.map((kpi) => {
                    const progress = kpi.progress_percentage;
                    const hasProgress = progress !== null && progress !== undefined;
                    const latestVal = kpi.measurements?.length > 0 ? kpi.measurements[kpi.measurements.length - 1].measured_value : null;

                    return (
                      <div key={kpi.id} className="p-4 bg-[#FFFDF5] border-2 border-black space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-black text-sm uppercase">{kpi.kpi_name}</h4>
                            <p className="text-xs text-black font-bold mt-0.5">{kpi.description || "No description provided."}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-[#FFD93D] text-black border border-black text-[10px] uppercase font-black font-mono">
                            {kpi.measurement_frequency}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs border-t-2 border-b-2 border-black py-2.5 font-mono">
                          <div>
                            <span className="text-black text-[10px] block font-bold uppercase">BASELINE</span>
                            <span className="text-black font-black">{kpi.baseline_value !== null ? `${kpi.baseline_value} ${kpi.unit}` : "Not Set"}</span>
                          </div>
                          <div>
                            <span className="text-black text-[10px] block font-bold uppercase">TARGET VALUE ({kpi.target_direction})</span>
                            <span className="text-black font-black">{kpi.target_value !== null ? `${kpi.target_value} ${kpi.unit}` : "Not Set"}</span>
                          </div>
                          <div className="flex justify-between items-center md:justify-end gap-3">
                            <div>
                              <span className="text-black text-[10px] block text-left md:text-right font-bold uppercase">LATEST MEASURED</span>
                              <span className="font-black text-black bg-[#C4B5FD] px-1 border border-black inline-block">{latestVal !== null ? `${latestVal} ${kpi.unit}` : "No Data"}</span>
                            </div>
                            <button
                              onClick={() => setMeasuringKpiId(kpi.id)}
                              className="gov-btn-primary text-[10px] py-1 px-2.5 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3 stroke-[3px]" /> Record
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1 font-mono">
                          <div className="flex justify-between text-[10px] font-black">
                            <span className="text-black uppercase">Target Achievement Progress</span>
                            <span className="text-black bg-[#86EFAC] px-1 border border-black">{hasProgress ? `${progress}%` : kpi.reason || "Missing configuration / metrics"}</span>
                          </div>
                          <div className="w-full bg-white border-2 border-black h-3 overflow-hidden">
                            <div
                              className="bg-[#FF6B6B] h-full transition-all duration-300 border-r-2 border-black"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black max-w-md w-full p-6 space-y-4 shadow-[12px_12px_0px_0px_#000]">
            <h3 className="text-base font-black text-black uppercase font-display">Record KPI Actual Metric</h3>
            <div>
              <label className="text-xs font-black text-black uppercase block mb-1">Measured Value</label>
              <input
                type="number"
                value={measuredVal}
                onChange={(e) => setMeasuredVal(e.target.value)}
                placeholder="e.g. 35.5"
                className="w-full p-2.5 bg-white border-2 border-black text-xs font-mono font-bold text-black"
              />
            </div>
            <div>
              <label className="text-xs font-black text-black uppercase block mb-1">Evidence Document UUID (Optional)</label>
              <input
                type="text"
                value={measuredEvidence}
                onChange={(e) => setMeasuredEvidence(e.target.value)}
                placeholder="UUID"
                className="w-full p-2.5 bg-white border-2 border-black text-xs font-mono font-bold text-black"
              />
            </div>
            <div>
              <label className="text-xs font-black text-black uppercase block mb-1">Remarks (Optional)</label>
              <textarea
                value={measuredRemarks}
                onChange={(e) => setMeasuredRemarks(e.target.value)}
                placeholder="Remarks, caveats or description..."
                className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setMeasuringKpiId(null)} className="gov-btn-secondary text-xs">Cancel</button>
              <button onClick={handleRecordMeasurement} className="gov-btn-primary text-xs">Record Measurement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
