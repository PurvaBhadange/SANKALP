"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, FileText, Layers, Award } from "lucide-react";

export default function PilotDecisionPage() {
  const params = useParams();
  const router = useRouter();
  const pilotId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Proposal form state
  const [decision, setDecision] = useState<string>("scale_up");
  const [justification, setJustification] = useState<string>("");
  const [contractValue, setContractValue] = useState<string>("");
  const [scaleUpNotes, setScaleUpNotes] = useState<string>("");
  const [extendedEndDate, setExtendedEndDate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Active decisions list
  const [activeDecision, setActiveDecision] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Send-back modal state
  const [sendBackComments, setSendBackComments] = useState<string>("");
  const [showSendBackModal, setShowSendBackModal] = useState(false);

  useEffect(() => {
    if (pilotId) {
      loadData();
    }
  }, [pilotId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Fetch Current User
      const userRes = await fetchWithAuth("/auth/me");
      if (userRes.ok) {
        const uData = await userRes.json();
        setCurrentUser(uData);
      }

      // Fetch Decision Brief
      const briefRes = await fetchWithAuth(`/pilots/${pilotId}/decision-brief`);
      if (!briefRes.ok) {
        const bErr = await briefRes.json();
        setError(bErr.detail || "Failed to load decision brief.");
        setLoading(false);
        return;
      }
      const bData = await briefRes.json();
      setBrief(bData);

      // Fetch existing decisions
      const decRes = await fetchWithAuth(`/procurement-decisions?status=proposed`);
      if (decRes.ok) {
        const decList = await decRes.json();
        const found = decList.find((d: any) => d.pilot_id === pilotId);
        setActiveDecision(found || null);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProposeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    const payload: any = {
      decision,
      justification,
    };

    if (decision === "scale_up") {
      if (!contractValue) {
        setFormError("Contract value is required for scale up.");
        setSubmitting(false);
        return;
      }
      payload.contract_value = parseFloat(contractValue);
      payload.scale_up_details = { notes: scaleUpNotes || "Approved for state-wide deployment." };
    }

    if (decision === "extend_pilot") {
      if (!extendedEndDate) {
        setFormError("Extended end date is required.");
        setSubmitting(false);
        return;
      }
      payload.extended_end_date = extendedEndDate;
    }

    try {
      const res = await fetchWithAuth(`/pilots/${pilotId}/procurement-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.detail || "Failed to propose decision.");
      } else {
        setFormSuccess("Procurement decision proposed successfully!");
        setJustification("");
        setContractValue("");
        setScaleUpNotes("");
        setExtendedEndDate("");
        loadData();
      }
    } catch (err: any) {
      setFormError(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!activeDecision) return;
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetchWithAuth(`/procurement-decisions/${activeDecision.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.detail || "Approval failed.");
      } else {
        setFormSuccess("Procurement decision approved successfully!");
        loadData();
      }
    } catch (err: any) {
      setFormError(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendBack() {
    if (!activeDecision || !sendBackComments.trim()) {
      setFormError("Comments are required for send-back.");
      return;
    }
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetchWithAuth(`/procurement-decisions/${activeDecision.id}/send-back`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: sendBackComments }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.detail || "Send-back failed.");
      } else {
        setFormSuccess("Procurement decision sent back to officer.");
        setShowSendBackModal(false);
        setSendBackComments("");
        loadData();
      }
    } catch (err: any) {
      setFormError(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  const isSuperAdmin = currentUser?.roles?.some((r: any) => r.name === "SUPER_ADMIN");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] text-slate-900 pb-16 font-sans bg-halftone">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 mt-12 text-center font-mono font-black text-xs uppercase">
          Loading Decision Brief...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] text-slate-900 pb-16 font-sans bg-halftone">
        <Navbar />
        <div className="max-w-xl mx-auto mt-12 p-6 bg-[#FF6B6B] border-4 border-black shadow-[8px_8px_0px_0px_#000] space-y-4">
          <h3 className="font-black text-black font-display uppercase text-lg">Decision Brief Unavailable</h3>
          <p className="text-xs font-bold text-black uppercase">{error}</p>
          <button onClick={() => router.back()} className="gov-btn-secondary text-xs">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 pb-16 font-sans bg-halftone">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-6">
          <div>
            <button onClick={() => router.back()} className="text-xs font-black text-black uppercase flex items-center gap-1 mb-2 hover:underline">
              <ArrowLeft className="w-4 h-4 stroke-[3px]" /> Back to Pilots
            </button>
            <h1 className="text-3xl font-black text-black tracking-tight font-display uppercase">
              Executive Decision Brief
            </h1>
            <p className="text-xs text-black font-bold uppercase mt-1">
              Consolidated evaluation & performance brief for procurement finalization.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap font-mono font-black">
            <span className="status-pill status-published">
              PILOT STATUS: {brief.pilot_status.toUpperCase()}
            </span>
            <button onClick={() => router.push(`/challenges/${brief.challenge.id}/lifecycle`)} className="gov-btn-primary text-xs">
              View Challenge Story Lifecycle →
            </button>
          </div>
        </div>

        {formError && (
          <div className="p-4 bg-[#FF6B6B] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000]">
            ⚠️ {formError}
          </div>
        )}

        {formSuccess && (
          <div className="p-4 bg-[#86EFAC] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000]">
            ✅ {formSuccess}
          </div>
        )}

        {/* 4-Grid Decision Brief Dashboard */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Card 1: Challenge Outcomes */}
        <div className="bg-white border-4 border-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#000]">
          <h2 className="text-lg font-black text-black font-display uppercase flex items-center gap-2">
            📋 1. Challenge & Problem Statement
          </h2>
          <div>
            <span className="text-[10px] font-black text-black uppercase block tracking-wider">Challenge Title</span>
            <div className="text-base font-bold text-black mt-0.5">{brief.challenge.title}</div>
          </div>
          <div>
            <span className="text-[10px] font-black text-black uppercase block tracking-wider">Budget Ceiling</span>
            <div className="text-sm font-mono font-black text-black bg-[#FFD93D] px-1 border border-black inline-block mt-0.5">
              {brief.challenge.currency} {brief.challenge.budget_ceiling ? brief.challenge.budget_ceiling.toLocaleString() : "N/A"}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-black text-black uppercase block tracking-wider">Problem Statement</span>
            <p className="text-xs text-black font-bold leading-relaxed mt-1">{brief.challenge.raw_problem_text}</p>
          </div>
        </div>

        {/* Card 2: Application Score & Ranking */}
        <div className="bg-white border-4 border-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#000]">
          <h2 className="text-lg font-black text-black font-display uppercase flex items-center gap-2">
            🏆 2. Candidate Evaluation & Ranking
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#FFFDF5] p-3 border-2 border-black">
              <span className="text-[10px] font-black text-black uppercase block">Startup Name</span>
              <div className="text-sm font-black text-black">{brief.application_evaluation.startup_name}</div>
            </div>
            <div className="bg-[#FFFDF5] p-3 border-2 border-black">
              <span className="text-[10px] font-black text-black uppercase block">Rank Position</span>
              <div className="text-sm font-black text-black font-mono bg-[#C4B5FD] px-1 border border-black inline-block">#{brief.application_evaluation.rank} Shortlisted</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#FFFDF5] p-3 border-2 border-black">
              <span className="text-[10px] font-black text-black uppercase block">Weighted Final Score</span>
              <div className="text-lg font-mono font-black text-black">{brief.application_evaluation.weighted_final_score} / 100</div>
            </div>
            <div className="bg-[#FFFDF5] p-3 border-2 border-black">
              <span className="text-[10px] font-black text-black uppercase block">AI Match Score</span>
              <div className="text-lg font-mono font-black text-black bg-[#86EFAC] px-1 border border-black inline-block">
                {brief.application_evaluation.ai_match_score ? `${brief.application_evaluation.ai_match_score}%` : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: KPI Metrics & AI Summary */}
        <div className="bg-white border-4 border-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#000]">
          <h2 className="text-lg font-black text-black font-display uppercase flex items-center gap-2">
            📊 3. KPI Achievement & AI Executive Summary
          </h2>
          <div className="max-h-36 overflow-y-auto space-y-2 font-mono">
            {brief.kpi_progress.kpis.map((k: any) => (
              <div key={k.id} className="flex justify-between items-center text-xs pb-1 border-b border-black font-bold">
                <div>
                  <span className="text-black font-black uppercase">{k.name}</span>
                  <span className="text-black/70 ml-1">({k.unit})</span>
                </div>
                <div className="text-right">
                  <span className="font-black bg-[#86EFAC] px-1 border border-black">
                    {k.progress_percentage !== null ? `${k.progress_percentage}%` : "Uncalculated"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#FFFDF5] p-3 border-2 border-black text-xs font-bold text-black space-y-1">
            <span className="font-black uppercase block bg-[#FFD93D] px-1 border border-black inline-block">🤖 AI Performance Summary</span>
            <p className="leading-relaxed">{brief.kpi_progress.performance_summary || "Performance summary generated."}</p>
          </div>
        </div>

        {/* Card 4: Financial Breakdown */}
        <div className="bg-white border-4 border-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#000]">
          <h2 className="text-lg font-black text-black font-display uppercase flex items-center gap-2">
            💰 4. Pilot Financials & Milestone History
          </h2>
          <div className="grid grid-cols-3 gap-2 font-mono">
            <div className="bg-[#FFFDF5] p-2 border-2 border-black">
              <span className="text-[9px] font-black text-black uppercase block">Pilot Budget</span>
              <div className="text-xs font-black text-black">₹{brief.financial_breakdown.pilot_budget.toLocaleString()}</div>
            </div>
            <div className="bg-[#FFFDF5] p-2 border-2 border-black">
              <span className="text-[9px] font-black text-black uppercase block">Total Paid</span>
              <div className="text-xs font-black text-black bg-[#86EFAC] px-0.5 border border-black inline-block">₹{brief.financial_breakdown.total_paid.toLocaleString()}</div>
            </div>
            <div className="bg-[#FFFDF5] p-2 border-2 border-black">
              <span className="text-[9px] font-black text-black uppercase block">Pending</span>
              <div className="text-xs font-black text-black bg-[#FFD93D] px-0.5 border border-black inline-block">₹{brief.financial_breakdown.total_pending.toLocaleString()}</div>
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1.5 font-mono text-xs">
            {brief.financial_breakdown.milestones.map((m: any) => (
              <div key={m.id} className="flex justify-between pb-1 border-b border-black font-bold">
                <span>{m.title}</span>
                <span className="font-black">
                  ₹{m.payment_amount.toLocaleString()} ({m.status.toUpperCase()})
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Procurement Decision Workbench */}
      <div className="bg-white border-4 border-black p-6 space-y-6 shadow-[8px_8px_0px_0px_#000]">
        <h2 className="text-xl font-black text-black font-display uppercase">
          ⚖️ Procurement Decision Workbench
        </h2>

        {activeDecision ? (
          <div className="bg-[#FFFDF5] border-3 border-black p-5 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-base font-black text-black font-mono uppercase bg-[#FFD93D] px-2 py-0.5 border border-black">
                PENDING PROPOSAL: {activeDecision.decision.toUpperCase()}
              </span>
              <span className="status-pill status-pending">
                Status: {activeDecision.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs font-bold text-black">
              <strong>Justification:</strong> {activeDecision.justification}
            </p>
            {activeDecision.decision === "scale_up" && (
              <div className="text-xs font-mono font-black text-black bg-[#86EFAC] px-2 py-1 border border-black inline-block">
                <strong>Proposed Contract Value:</strong> ₹{activeDecision.contract_value?.toLocaleString()}
              </div>
            )}
            {activeDecision.decision === "extend_pilot" && (
              <div className="text-xs font-mono font-black text-black bg-[#FFD93D] px-2 py-1 border border-black inline-block">
                <strong>Extended End Date:</strong> {activeDecision.extended_end_date}
              </div>
            )}

            {isSuperAdmin ? (
              <div className="flex gap-4 pt-4 border-t-2 border-black">
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="gov-btn-primary text-xs"
                >
                  ✓ Approve Decision (Finalize)
                </button>
                <button
                  onClick={() => setShowSendBackModal(true)}
                  disabled={submitting}
                  className="gov-btn-secondary text-xs"
                >
                  ↩ Send Back to Officer
                </button>
              </div>
            ) : (
              <p className="text-xs text-black font-bold uppercase italic pt-2">
                Proposal is currently pending Super Admin review & maker-checker sign-off.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleProposeSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black text-black uppercase block mb-1">Procurement Decision</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
                >
                  <option value="scale_up">Scale-Up (Commercial Contract)</option>
                  <option value="reject">Reject Solution</option>
                  <option value="extend_pilot">Extend Pilot Term</option>
                  <option value="terminate">Terminate Project</option>
                </select>
              </div>

              {decision === "scale_up" && (
                <div>
                  <label className="text-xs font-black text-black uppercase block mb-1">Scale-Up Contract Value (₹)</label>
                  <input
                    type="number"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    placeholder="e.g. 5000000.00"
                    className="w-full p-2.5 bg-white border-2 border-black text-xs font-mono font-bold text-black"
                  />
                </div>
              )}

              {decision === "extend_pilot" && (
                <div>
                  <label className="text-xs font-black text-black uppercase block mb-1">Extended End Date</label>
                  <input
                    type="date"
                    value={extendedEndDate}
                    onChange={(e) => setExtendedEndDate(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-black text-xs font-bold text-black"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-black uppercase block mb-1">Justification & Rationale</label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Detail technical accuracy, KPI achievement metrics, and operational readiness..."
                className="w-full p-3 bg-white border-2 border-black text-xs font-bold text-black focus:bg-[#FFFDF5]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="gov-btn-primary text-xs"
            >
              {submitting ? "Submitting..." : "Submit Procurement Proposal →"}
            </button>
          </form>
        )}
      </div>
      </main>

      {/* Send Back Modal */}
      {showSendBackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full space-y-4 shadow-[12px_12px_0px_0px_#000]">
            <h3 className="text-base font-black text-black font-display uppercase">Send Back Procurement Decision</h3>
            <p className="text-xs font-bold text-black uppercase">Provide required feedback notes explaining why the proposal is sent back to the officer.</p>
            <textarea
              rows={4}
              value={sendBackComments}
              onChange={(e) => setSendBackComments(e.target.value)}
              placeholder="Comments on budget, contract value or KPI progress..."
              className="w-full p-3 bg-white border-2 border-black text-xs font-bold text-black"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowSendBackModal(false)} className="gov-btn-secondary text-xs">
                Cancel
              </button>
              <button onClick={handleSendBack} className="gov-btn-primary text-xs">
                Confirm Send-Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
