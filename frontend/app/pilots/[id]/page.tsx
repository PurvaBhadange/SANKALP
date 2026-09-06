"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getCookie } from "cookies-next";
import { 
  ArrowLeft, Building2, CheckCircle2, Clock, Sparkles, FileText, 
  Upload, ShieldCheck, DollarSign, Lock, AlertTriangle, Loader2, Play
} from "lucide-react";
import { AIFallbackBanner } from "@/components/AIFallbackBanner";
import { Navbar } from "@/components/Navbar";
import { fetchWithAuth } from "@/lib/api";

export default function OfficerPilotWorkbenchPage() {
  const { id } = useParams();
  const [pilot, setPilot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for terms update
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [ipTerms, setIpTerms] = useState("");
  const [dataTerms, setDataTerms] = useState("");
  const [contractDocId, setContractDocId] = useState("");

  // Milestone create form
  const [msTitle, setMsTitle] = useState("");
  const [msDesc, setMsDesc] = useState("");
  const [msDueDate, setMsDueDate] = useState("");
  const [msAmount, setMsAmount] = useState("");

  // Payment initiate modal
  const [initPayMsId, setInitPayMsId] = useState<string | null>(null);
  const [payRef, setPayRef] = useState("");

  // Payment confirm modal
  const [confirmPayMsId, setConfirmPayMsId] = useState<string | null>(null);
  const [payProofDocId, setPayProofDocId] = useState("");

  // Module 7 KPI states
  const [kpis, setKpis] = useState<any[]>([]);
  const [kpiSuccess, setKpiSuccess] = useState<string | null>(null);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Form states for adding manual KPI
  const [newKpiName, setNewKpiName] = useState("");
  const [newKpiUnit, setNewKpiUnit] = useState("");
  const [newKpiDir, setNewKpiDir] = useState("increase");
  const [newKpiFreq, setNewKpiFreq] = useState("monthly");
  const [newKpiDesc, setNewKpiDesc] = useState("");

  // Recording measurements
  const [measuringKpiId, setMeasuringKpiId] = useState<string | null>(null);
  const [measuredVal, setMeasuredVal] = useState("");
  const [measuredRemarks, setMeasuredRemarks] = useState("");
  const [measuredEvidence, setMeasuredEvidence] = useState("");

  // Editing baseline/target values
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [editKpiTarget, setEditKpiTarget] = useState("");
  const [editKpiBaseline, setEditKpiBaseline] = useState("");
  const [editKpiFreq, setEditKpiFreq] = useState("monthly");
  const [editKpiDesc, setEditKpiDesc] = useState("");

  const fetchPilot = async () => {
    setLoading(true);
    setError(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/pilots/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const p = await res.json();
        setPilot(p);
        setStartDate(p.start_date || "");
        setEndDate(p.end_date || "");
        setBudget(p.budget ? String(p.budget) : "");
        setIpTerms(p.ip_ownership_terms || "");
        setDataTerms(p.data_ownership_terms || "");
        setContractDocId(p.contract_document_id || "");
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to load pilot project.");
      }
    } catch (e: any) {
      setError("Network error loading pilot details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/pilots/${id}/kpis`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setKpis(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAISummary = async (refresh = false) => {
    setLoadingSummary(true);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/pilots/${id}/performance-summary${refresh ? "?refresh=true" : ""}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAiSummary(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPilot();
      fetchKPIs();
      fetchAISummary();
    }
  }, [id]);

  const handleDraftAI = async () => {
    setActionLoading("ai-draft");
    setError(null);
    setSuccessMsg(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/pilots/${id}/draft-contract`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg("AI draft contract generated successfully!");
        fetchPilot();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to draft contract with AI.");
      }
    } catch (e) {
      setError("Network error generating AI contract draft.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveTerms = async () => {
    setActionLoading("save-terms");
    setError(null);
    setSuccessMsg(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/pilots/${id}`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          start_date: startDate || null,
          end_date: endDate || null,
          budget: budget ? parseFloat(budget) : null,
          ip_ownership_terms: ipTerms || null,
          data_ownership_terms: dataTerms || null,
          contract_document_id: contractDocId || null
        })
      });
      if (res.ok) {
        setSuccessMsg("Pilot contract terms updated.");
        fetchPilot();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to update contract terms.");
      }
    } catch (e) {
      setError("Network error saving terms.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle || !msDueDate || !msAmount) return;
    setActionLoading("create-ms");
    setError(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/pilots/${id}/milestones`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: msTitle,
          description: msDesc || null,
          due_date: msDueDate,
          payment_amount: parseFloat(msAmount)
        })
      });
      if (res.ok) {
        setMsTitle("");
        setMsDesc("");
        setMsDueDate("");
        setMsAmount("");
        setSuccessMsg("Milestone created successfully.");
        fetchPilot();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to create milestone.");
      }
    } catch (e) {
      setError("Network error creating milestone.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalizeContract = async () => {
    setActionLoading("finalize");
    setError(null);
    setSuccessMsg(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/pilots/${id}/finalize-contract`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg("Pilot contract finalized! Contract terms locked and pilot status activated.");
        fetchPilot();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to finalize contract.");
      }
    } catch (e) {
      setError("Network error finalizing contract.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveMilestone = async (msId: string) => {
    setActionLoading(`approve-${msId}`);
    setError(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/milestones/${msId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg("Milestone evidence approved.");
        fetchPilot();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to approve milestone.");
      }
    } catch (e) {
      setError("Network error approving milestone.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleInitiatePayment = async () => {
    if (!initPayMsId || !payRef.trim()) return;
    setActionLoading(`init-pay-${initPayMsId}`);
    setError(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/milestones/${initPayMsId}/initiate-payment`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ payment_reference: payRef })
      });
      if (res.ok) {
        setInitPayMsId(null);
        setPayRef("");
        setSuccessMsg("Payment initiated. Pending maker-checker confirmation.");
        fetchPilot();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to initiate payment.");
      }
    } catch (e) {
      setError("Network error initiating payment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!confirmPayMsId || !payProofDocId.trim()) return;
    setActionLoading(`conf-pay-${confirmPayMsId}`);
    setError(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/milestones/${confirmPayMsId}/confirm-payment`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ payment_proof_document_id: payProofDocId })
      });
      if (res.ok) {
        setConfirmPayMsId(null);
        setPayProofDocId("");
        setSuccessMsg("Payment confirmed successfully! Milestone status marked as Paid.");
        fetchPilot();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Payment confirmation failed.");
      }
    } catch (e) {
      setError("Network error confirming payment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuggestKPIs = async () => {
    setKpiError(null);
    setKpiSuccess(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/pilots/${id}/kpis/suggest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setKpiSuccess(data.message || "Suggested KPIs pulled successfully.");
        fetchKPIs();
      } else {
        setKpiError(data.detail || "Failed to suggest KPIs.");
      }
    } catch (e) {
      setKpiError("Network error requesting suggested KPIs.");
    }
  };

  const handleAddManualKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKpiName || !newKpiUnit) return;
    setKpiError(null);
    setKpiSuccess(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/pilots/${id}/kpis`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          kpi_name: newKpiName,
          description: newKpiDesc || null,
          unit: newKpiUnit,
          target_direction: newKpiDir,
          measurement_frequency: newKpiFreq
        })
      });
      if (res.ok) {
        setKpiSuccess("Custom KPI added successfully.");
        setNewKpiName("");
        setNewKpiDesc("");
        setNewKpiUnit("");
        fetchKPIs();
      } else {
        const err = await res.json();
        setKpiError(err.detail || "Failed to add KPI.");
      }
    } catch (e) {
      setKpiError("Network error adding KPI.");
    }
  };

  const handleUpdateKPI = async () => {
    if (!editingKpiId) return;
    setKpiError(null);
    setKpiSuccess(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/pilot_kpis/${editingKpiId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          description: editKpiDesc || null,
          target_value: editKpiTarget ? parseFloat(editKpiTarget) : null,
          baseline_value: editKpiBaseline ? parseFloat(editKpiBaseline) : null,
          measurement_frequency: editKpiFreq || null
        })
      });
      if (res.ok) {
        setKpiSuccess("KPI baseline/target values updated.");
        setEditingKpiId(null);
        fetchKPIs();
      } else {
        const err = await res.json();
        setKpiError(err.detail || "Failed to update KPI values.");
      }
    } catch (e) {
      setKpiError("Network error updating KPI.");
    }
  };

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
        setKpiSuccess("Measurement recorded successfully.");
        setMeasuringKpiId(null);
        setMeasuredVal("");
        setMeasuredRemarks("");
        setMeasuredEvidence("");
        fetchKPIs();
        fetchAISummary(true);
      } else {
        const err = await res.json();
        setKpiError(err.detail || "Failed to record measurement.");
      }
    } catch (e) {
      setKpiError("Network error recording measurement.");
    }
  };

  const handleCompletePilot = async () => {
    setActionLoading("complete-pilot");
    setError(null);
    setSuccessMsg(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/pilots/${id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg("Pilot project successfully marked as COMPLETED.");
        fetchPilot();
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to complete pilot.");
      }
    } catch (e) {
      setError("Network error completing pilot.");
    } finally {
      setActionLoading(null);
    }
  };

  const isFinalized = pilot?.contract_status === "finalized";

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 pb-16 font-sans bg-halftone">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* Header Title & Status Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/pilots"
              className="p-2 rounded-xl bg-white border-2 border-black text-black hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000] transition-all"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3px]" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight font-display uppercase flex items-center gap-2">
                <Building2 className="w-6 h-6 text-black stroke-[3px]" /> Pilot Contract & Workbench
              </h1>
              <p className="text-xs text-black font-bold font-mono mt-0.5 uppercase">
                {pilot?.application?.startup?.name ? `Startup: ${pilot.application.startup.name}` : "Pilot Project"}
              </p>
            </div>
          </div>

          {pilot && (
            <div className="flex items-center gap-2 flex-wrap font-mono font-black">
              <span className={`status-pill ${pilot.contract_status === "finalized" ? "status-published" : "status-pending"}`}>
                Contract: {pilot.contract_status}
              </span>
              <span className={`status-pill ${pilot.status === "active" ? "status-active" : "status-draft"}`}>
                Status: {pilot.status}
              </span>
              {pilot.status === "active" && (
                <button
                  onClick={handleCompletePilot}
                  disabled={actionLoading === "complete-pilot"}
                  className="gov-btn-primary py-1.5 text-xs"
                >
                  {actionLoading === "complete-pilot" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[3px]" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[3px]" />
                  )}
                  <span>Mark Completed</span>
                </button>
              )}
            </div>
          )}
        </div>
        {error && (
          <div className="p-4 bg-[#FF6B6B] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 stroke-[3px]" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-[#86EFAC] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 stroke-[3px]" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-black gap-3 font-mono font-black">
            <Loader2 className="w-10 h-10 animate-spin text-black stroke-[3px]" />
            <p className="text-xs uppercase">Loading pilot details and contract state...</p>
          </div>
        ) : !pilot ? (
          <div className="bg-white p-12 text-center border-4 border-black shadow-[8px_8px_0px_0px_#000]">
            <h3 className="text-base font-black text-black font-display uppercase">Pilot Project Not Found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: AI Draft & Contract Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {/* AI Contract Assistant Box */}
              <div className="bg-white border-4 border-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#000]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-black stroke-[3px]" />
                    <h3 className="font-black text-black text-base font-display uppercase">Gemini AI Legal & Contract Drafter</h3>
                  </div>
                  {!isFinalized && (
                    <button
                      onClick={handleDraftAI}
                      disabled={actionLoading === "ai-draft"}
                      className="gov-btn-primary text-xs"
                    >
                      {actionLoading === "ai-draft" ? (
                        <Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />
                      ) : (
                        <Play className="w-4 h-4 fill-black stroke-[3px]" />
                      )}
                      <span>Generate AI Contract Proposal</span>
                    </button>
                  )}
                </div>

                {pilot.contract_ai_draft ? (
                  <div className="space-y-3 bg-[#FFFDF5] p-4 border-2 border-black text-xs font-bold">
                    <div>
                      <span className="font-black text-black uppercase tracking-wider text-[10px] bg-[#FFD93D] px-1 border border-black inline-block">AI Suggested IP Terms:</span>
                      <p className="text-black mt-1">{pilot.contract_ai_draft.ip_ownership_terms}</p>
                    </div>
                    <div>
                      <span className="font-black text-black uppercase tracking-wider text-[10px] bg-[#FFD93D] px-1 border border-black inline-block">AI Suggested Data Ownership Terms:</span>
                      <p className="text-black mt-1">{pilot.contract_ai_draft.data_ownership_terms}</p>
                    </div>
                    {pilot.contract_ai_draft.suggested_milestones && (
                      <div>
                        <span className="font-black text-black uppercase tracking-wider text-[10px] bg-[#C4B5FD] px-1 border border-black inline-block">AI Suggested Milestones:</span>
                        <div className="mt-1 space-y-1 font-mono">
                          {pilot.contract_ai_draft.suggested_milestones.map((m: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-black bg-white p-2 border border-black">
                              <span>{m.title} (+{m.days_from_start}d)</span>
                              <span className="font-mono text-black font-black bg-[#86EFAC] px-1 border border-black">{m.payment_percentage}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-black font-bold uppercase">No AI contract draft generated yet. Click "Generate AI Contract Proposal" to ask Gemini for legal terms and milestone recommendations.</p>
                )}
              </div>

              {/* Final Contract Terms Form */}
              <div className="bg-white border-4 border-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#000]">
                <div className="flex items-center justify-between border-b-2 border-black pb-3">
                  <h3 className="font-black text-black text-base font-display uppercase flex items-center gap-2">
                    <FileText className="w-5 h-5 text-black stroke-[3px]" />
                    Official Contract Terms & Execution
                  </h3>
                  {isFinalized && (
                    <span className="flex items-center gap-1 text-xs font-black text-black bg-[#86EFAC] px-2.5 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] uppercase font-mono">
                      <Lock className="w-3.5 h-3.5 stroke-[3px]" /> Terms Locked
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-black text-black uppercase block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      disabled={isFinalized}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-black uppercase block mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      disabled={isFinalized}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-black uppercase block mb-1">Total Budget (INR)</label>
                    <input
                      type="number"
                      value={budget}
                      disabled={isFinalized}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="e.g. 500000.00"
                      className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold font-mono text-black disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-black uppercase block mb-1">IP Ownership Terms</label>
                  <textarea
                    rows={3}
                    value={ipTerms}
                    disabled={isFinalized}
                    onChange={(e) => setIpTerms(e.target.value)}
                    placeholder="Explicit IP ownership clauses..."
                    className="w-full p-3 bg-white border-2 border-black text-xs font-bold text-black disabled:bg-slate-100 focus:outline-none focus:bg-[#FFFDF5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-black uppercase block mb-1">Data Ownership Terms</label>
                  <textarea
                    rows={3}
                    value={dataTerms}
                    disabled={isFinalized}
                    onChange={(e) => setDataTerms(e.target.value)}
                    placeholder="Data ownership and telemetry privacy clauses..."
                    className="w-full p-3 bg-white border-2 border-black text-xs font-bold text-black disabled:bg-slate-100 focus:outline-none focus:bg-[#FFFDF5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-black uppercase block mb-1">Contract Document UUID (from /documents upload)</label>
                  <input
                    type="text"
                    value={contractDocId}
                    disabled={isFinalized}
                    onChange={(e) => setContractDocId(e.target.value)}
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                    className="w-full p-2.5 bg-white border-2 border-black text-xs font-mono font-bold text-black disabled:bg-slate-100"
                  />
                </div>

                {!isFinalized && (
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={handleSaveTerms}
                      disabled={actionLoading === "save-terms"}
                      className="gov-btn-secondary text-xs"
                    >
                      Save Draft Terms
                    </button>

                    <button
                      onClick={handleFinalizeContract}
                      disabled={actionLoading === "finalize"}
                      className="gov-btn-primary text-xs"
                    >
                      {actionLoading === "finalize" ? (
                        <Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 stroke-[3px]" />
                      )}
                      <span>Finalize Contract & Lock Terms</span>
                    </button>
                  </div>
                )}
              </div>

              {/* KPI Tracking & Metric Reporting */}
              {isFinalized && (
                <div className="bg-white border-4 border-black p-6 space-y-6 shadow-[8px_8px_0px_0px_#000]">
                  <div className="flex items-center justify-between border-b-2 border-black pb-3">
                    <h3 className="font-black text-black text-base font-display uppercase flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-black stroke-[3px]" />
                      KPI Performance Workspace
                    </h3>
                    <button
                      onClick={handleSuggestKPIs}
                      className="gov-btn-secondary text-xs"
                    >
                      Suggest AI KPIs
                    </button>
                  </div>

                  {kpiError && (
                    <div className="p-3.5 bg-[#FF6B6B] border-2 border-black text-black text-xs font-black uppercase">
                      {kpiError}
                    </div>
                  )}
                  {kpiSuccess && (
                    <div className="p-3.5 bg-[#86EFAC] border-2 border-black text-black text-xs font-black uppercase">
                      {kpiSuccess}
                    </div>
                  )}

                  {/* Manual KPI Creation Form */}
                  <form onSubmit={handleAddManualKPI} className="p-4 bg-[#FFFDF5] border-2 border-black space-y-3">
                    <h4 className="font-black text-black text-xs uppercase">Add Custom KPI</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="KPI Name (e.g. System Uptime)"
                        value={newKpiName}
                        onChange={(e) => setNewKpiName(e.target.value)}
                        className="p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Unit (e.g. %, hours, users)"
                        value={newKpiUnit}
                        onChange={(e) => setNewKpiUnit(e.target.value)}
                        className="p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select
                        value={newKpiDir}
                        onChange={(e) => setNewKpiDir(e.target.value)}
                        className="p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
                      >
                        <option value="increase">Increase (higher is better)</option>
                        <option value="decrease">Decrease (lower is better)</option>
                      </select>
                      <select
                        value={newKpiFreq}
                        onChange={(e) => setNewKpiFreq(e.target.value)}
                        className="p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                      <button
                        type="submit"
                        className="gov-btn-primary text-xs"
                      >
                        Add KPI
                      </button>
                    </div>
                  </form>

                  {/* KPIs Grid List */}
                  <div className="space-y-4">
                    {kpis.length === 0 ? (
                      <p className="text-xs text-black font-bold uppercase italic text-center py-4">No KPIs defined yet. Click "Suggest AI KPIs" or add a manual KPI above.</p>
                    ) : (
                      kpis.map((kpi) => {
                        const progress = kpi.progress_percentage;
                        const hasProgress = progress !== null && progress !== undefined;
                        const latestVal = kpi.measurements?.length > 0 ? kpi.measurements[kpi.measurements.length - 1].measured_value : null;

                        return (
                          <div key={kpi.id} className="p-4 bg-[#FFFDF5] border-2 border-black space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-black text-black text-sm uppercase">{kpi.kpi_name}</h4>
                                <p className="text-xs text-black font-bold mt-0.5">{kpi.description || "No description configured."}</p>
                              </div>
                              <span className="px-2 py-0.5 bg-[#FFD93D] text-black border border-black text-[10px] uppercase font-black font-mono">
                                {kpi.source} ({kpi.measurement_frequency})
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs border-t-2 border-b-2 border-black py-2.5 font-mono">
                              <div>
                                <span className="text-black text-[10px] block font-bold uppercase">BASELINE</span>
                                <span className="text-black font-black">{kpi.baseline_value !== null ? `${kpi.baseline_value} ${kpi.unit}` : "Not Configured"}</span>
                              </div>
                              <div>
                                <span className="text-black text-[10px] block font-bold uppercase">TARGET ({kpi.target_direction})</span>
                                <span className="text-black font-black">{kpi.target_value !== null ? `${kpi.target_value} ${kpi.unit}` : "Not Configured"}</span>
                              </div>
                              <div>
                                <span className="text-black text-[10px] block font-bold uppercase">LATEST VALUE</span>
                                <span className="text-black font-black bg-[#C4B5FD] px-1 border border-black">{latestVal !== null ? `${latestVal} ${kpi.unit}` : "No metrics"}</span>
                              </div>
                              <div className="flex items-center justify-end gap-1.5 col-span-2 md:col-span-1">
                                <button
                                  onClick={() => {
                                    setEditingKpiId(kpi.id);
                                    setEditKpiTarget(kpi.target_value ? String(kpi.target_value) : "");
                                    setEditKpiBaseline(kpi.baseline_value ? String(kpi.baseline_value) : "");
                                    setEditKpiFreq(kpi.measurement_frequency);
                                    setEditKpiDesc(kpi.description || "");
                                  }}
                                  className="gov-btn-secondary text-[10px] py-1 px-2"
                                >
                                  Edit Target
                                </button>
                                <button
                                  onClick={() => setMeasuringKpiId(kpi.id)}
                                  className="gov-btn-primary text-[10px] py-1 px-2"
                                >
                                  Add Value
                                </button>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1 font-mono">
                              <div className="flex justify-between text-[10px] font-black">
                                <span className="text-black uppercase">Target Progress Status</span>
                                <span className="text-black bg-[#86EFAC] px-1 border border-black">{hasProgress ? `${progress}%` : kpi.reason || "Missing data"}</span>
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
                      })
                    )}
                  </div>

                  {/* AI performance narrative summary */}
                  <div className="border-t-2 border-black pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-black stroke-[3px]" />
                        <h4 className="font-black text-black text-sm font-display uppercase">Factual Performance Narrative Summary (Gemini)</h4>
                      </div>
                      <button
                        onClick={() => fetchAISummary(true)}
                        disabled={loadingSummary}
                        className="gov-btn-primary text-xs flex items-center gap-1.5"
                      >
                        {loadingSummary ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[3px]" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 stroke-[3px]" />
                        )}
                        <span>{aiSummary?.summary ? "Regenerate Summary" : "Generate Summary"}</span>
                      </button>
                    </div>

                    {aiSummary?.summary && (
                      <div className="bg-[#FFFDF5] p-4 border-2 border-black space-y-3 text-xs font-bold text-black">
                        <AIFallbackBanner aiGenerated={aiSummary.ai_generated} />
                        <p className="whitespace-pre-line leading-relaxed">{aiSummary.summary}</p>
                        <p className="text-[10px] font-mono text-black">Narrative generated at: {new Date(aiSummary.generated_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Milestones & Payments */}
            <div className="space-y-6">
              {/* Milestone Create Form */}
              {!isFinalized && (
                <form onSubmit={handleCreateMilestone} className="bg-white border-4 border-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#000]">
                  <h3 className="font-black text-black text-sm font-display uppercase">Add Milestone</h3>
                  <div>
                    <input
                      type="text"
                      value={msTitle}
                      onChange={(e) => setMsTitle(e.target.value)}
                      placeholder="Milestone Title"
                      className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={msDesc}
                      onChange={(e) => setMsDesc(e.target.value)}
                      placeholder="Description (Optional)"
                      className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={msDueDate}
                      onChange={(e) => setMsDueDate(e.target.value)}
                      className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
                      required
                    />
                    <input
                      type="number"
                      value={msAmount}
                      onChange={(e) => setMsAmount(e.target.value)}
                      placeholder="Amount (INR)"
                      className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold font-mono text-black"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading === "create-ms"}
                    className="gov-btn-primary w-full text-xs"
                  >
                    Add Milestone
                  </button>
                </form>
              )}

              {/* Milestones List */}
              <div className="bg-white border-4 border-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#000]">
                <h3 className="font-black text-black text-sm font-display uppercase flex items-center justify-between">
                  <span>Milestones & Payments</span>
                  <span className="text-xs font-mono font-black bg-[#FFD93D] px-2 py-0.5 border border-black text-black">{pilot.milestones?.length || 0} Total</span>
                </h3>

                {pilot.milestones?.length === 0 ? (
                  <p className="text-xs text-black font-bold uppercase italic">No milestones defined yet.</p>
                ) : (
                  <div className="space-y-4">
                    {pilot.milestones.map((m: any) => (
                      <div key={m.id} className="p-4 bg-[#FFFDF5] border-2 border-black space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-black text-xs uppercase">{m.title}</h4>
                            <p className="text-[10px] font-mono text-black font-bold mt-1">Due: {m.due_date} | Amount: ₹{Number(m.payment_amount).toLocaleString()}</p>
                          </div>
                          <span className={`status-pill ${
                            m.status === "paid" ? "status-published" :
                            m.status === "approved" ? "status-active" :
                            m.status === "payment_initiated" ? "status-pending" :
                            "status-draft"
                          }`}>
                            {m.status}
                          </span>
                        </div>

                        {/* Milestone Actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-black">
                          {m.status === "submitted" && (
                            <button
                              onClick={() => handleApproveMilestone(m.id)}
                              disabled={actionLoading === `approve-${m.id}`}
                              className="gov-btn-primary text-[10px] py-1 px-2.5"
                            >
                              Approve Evidence
                            </button>
                          )}

                          {m.status === "approved" && (
                            <button
                              onClick={() => setInitPayMsId(m.id)}
                              className="gov-btn-primary text-[10px] py-1 px-2.5"
                            >
                              Initiate Payment
                            </button>
                          )}

                          {m.status === "payment_initiated" && (
                            <button
                              onClick={() => setConfirmPayMsId(m.id)}
                              className="gov-btn-primary text-[10px] py-1 px-2.5"
                            >
                              Confirm Payment (Checker)
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Initiate Payment Modal */}
      {initPayMsId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full space-y-4 shadow-[12px_12px_0px_0px_#000]">
            <h3 className="text-base font-black text-black font-display uppercase">Initiate Milestone Payment</h3>
            <p className="text-xs text-black font-bold uppercase">Provide payment reference ID (UTR / Transaction Reference):</p>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. UTR-2026-9988776655"
              className="w-full p-3 bg-white border-2 border-black text-xs font-mono font-bold text-black"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setInitPayMsId(null)} className="gov-btn-secondary text-xs">Cancel</button>
              <button onClick={handleInitiatePayment} disabled={!payRef.trim()} className="gov-btn-primary text-xs">Initiate Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {confirmPayMsId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full space-y-4 shadow-[12px_12px_0px_0px_#000]">
            <h3 className="text-base font-black text-black font-display uppercase">Confirm Payment (Maker-Checker Dual Approval)</h3>
            <p className="text-xs text-black font-bold uppercase">Provide payment proof document UUID (uploaded via /documents):</p>
            <input
              type="text"
              value={payProofDocId}
              onChange={(e) => setPayProofDocId(e.target.value)}
              placeholder="e.g. 987e6543-e21b-12d3-a456-426614174000"
              className="w-full p-3 bg-white border-2 border-black text-xs font-mono font-bold text-black"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setConfirmPayMsId(null)} className="gov-btn-secondary text-xs">Cancel</button>
              <button onClick={handleConfirmPayment} disabled={!payProofDocId.trim()} className="gov-btn-primary text-xs">Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
      {/* Configure KPI Target Modal */}
      {editingKpiId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full space-y-4 shadow-[12px_12px_0px_0px_#000]">
            <h3 className="text-base font-black text-black font-display uppercase">Configure KPI Baseline & Target</h3>
            <div>
              <label className="text-xs font-black text-black uppercase block mb-1">Baseline Value</label>
              <input
                type="number"
                value={editKpiBaseline}
                onChange={(e) => setEditKpiBaseline(e.target.value)}
                placeholder="e.g. 10.0"
                className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
              />
            </div>
            <div>
              <label className="text-xs font-black text-black uppercase block mb-1">Target Value</label>
              <input
                type="number"
                value={editKpiTarget}
                onChange={(e) => setEditKpiTarget(e.target.value)}
                placeholder="e.g. 50.0"
                className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
              />
            </div>
            <div>
              <label className="text-xs font-black text-black uppercase block mb-1">Measurement Frequency</label>
              <select
                value={editKpiFreq}
                onChange={(e) => setEditKpiFreq(e.target.value)}
                className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-black uppercase block mb-1">Description</label>
              <textarea
                value={editKpiDesc}
                onChange={(e) => setEditKpiDesc(e.target.value)}
                placeholder="KPI description details..."
                className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditingKpiId(null)} className="gov-btn-secondary text-xs">Cancel</button>
              <button onClick={handleUpdateKPI} className="gov-btn-primary text-xs">Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* Record KPI Measurement Modal */}
      {measuringKpiId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full space-y-4 shadow-[12px_12px_0px_0px_#000]">
            <h3 className="text-base font-black text-black font-display uppercase">Record KPI Actual Metric</h3>
            <div>
              <label className="text-xs font-black text-black uppercase block mb-1">Measured Value</label>
              <input
                type="number"
                value={measuredVal}
                onChange={(e) => setMeasuredVal(e.target.value)}
                placeholder="Measured value number"
                className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold font-mono text-black"
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
                placeholder="Enter remarks..."
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
