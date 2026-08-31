"use me";
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";

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
      <div style={{ padding: "40px", color: "#fff", background: "#0a0d14", minHeight: "100vh" }}>
        <h2>Loading Decision Brief...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", color: "#fff", background: "#0a0d14", minHeight: "100vh" }}>
        <div style={{ padding: "20px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", maxWidth: "600px" }}>
          <h3 style={{ color: "#ef4444", marginTop: 0 }}>Decision Brief Unavailable</h3>
          <p>{error}</p>
          <button onClick={() => router.back()} style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0d14", color: "#e2e8f0", minHeight: "100vh", padding: "32px 48px", fontFamily: "Inter, sans-serif" }}>
      {/* Header Navigation */}
      <div style={{ display: "flex", justifyContent: "space-[#3b82f6]", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <button onClick={() => router.back()} style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontSize: "14px", marginBottom: "8px" }}>
            ← Back to Pilots
          </button>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#f8fafc", margin: 0 }}>
            Executive Decision Brief
          </h1>
          <p style={{ color: "#94a3b8", margin: "4px 0 0 0", fontSize: "14px" }}>
            Consolidated evaluation & performance brief for procurement finalization.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ padding: "6px 14px", borderRadius: "20px", background: "rgba(16, 185, 129, 0.2)", color: "#10b981", border: "1px solid #10b981", fontSize: "13px", fontWeight: "600" }}>
            PILOT STATUS: {brief.pilot_status.toUpperCase()}
          </span>
          <button onClick={() => router.push(`/challenges/${brief.challenge.id}/lifecycle`)} style={{ padding: "8px 16px", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", border: "1px solid #3b82f6", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
            View Challenge Story Lifecycle →
          </button>
        </div>
      </div>

      {formError && (
        <div style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", color: "#fca5a5", marginBottom: "20px" }}>
          ⚠️ {formError}
        </div>
      )}

      {formSuccess && (
        <div style={{ padding: "12px 16px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", borderRadius: "8px", color: "#6ee7b7", marginBottom: "20px" }}>
          ✅ {formSuccess}
        </div>
      )}

      {/* 4-Grid Decision Brief Dashboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        
        {/* Card 1: Challenge Outcomes */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px", backdropFilter: "blur(12px)" }}>
          <h2 style={{ fontSize: "18px", color: "#38bdf8", marginTop: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            📋 1. Challenge & Problem Statement
          </h2>
          <div style={{ marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Challenge Title</span>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#f1f5f9" }}>{brief.challenge.title}</div>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Budget Ceiling</span>
            <div style={{ fontSize: "15px", color: "#f1f5f9" }}>
              {brief.challenge.currency} {brief.challenge.budget_ceiling ? brief.challenge.budget_ceiling.toLocaleString() : "N/A"}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Problem Statement</span>
            <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5", margin: "4px 0 0 0" }}>{brief.challenge.raw_problem_text}</p>
          </div>
        </div>

        {/* Card 2: Application Score & Ranking */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px", backdropFilter: "blur(12px)" }}>
          <h2 style={{ fontSize: "18px", color: "#a855f7", marginTop: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            🏆 2. Candidate Evaluation & Ranking
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Startup Name</span>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>{brief.application_evaluation.startup_name}</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Rank Position</span>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#c084fc" }}>#{brief.application_evaluation.rank} Shortlisted</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Weighted Final Score</span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#34d399" }}>{brief.application_evaluation.weighted_final_score} / 100</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>AI Match Score</span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#60a5fa" }}>
                {brief.application_evaluation.ai_match_score ? `${brief.application_evaluation.ai_match_score}%` : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: KPI Metrics & AI Summary */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px", backdropFilter: "blur(12px)" }}>
          <h2 style={{ fontSize: "18px", color: "#34d399", marginTop: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            📊 3. KPI Achievement & AI Executive Summary
          </h2>
          <div style={{ maxHeight: "140px", overflowY: "auto", marginBottom: "16px", paddingRight: "8px" }}>
            {brief.kpi_progress.kpis.map((k: any) => (
              <div key={k.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#f1f5f9", fontWeight: "600" }}>{k.name}</span>
                  <span style={{ color: "#94a3b8", marginLeft: "6px", fontSize: "11px" }}>({k.unit})</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: k.progress_percentage !== null ? "#34d399" : "#f59e0b", fontWeight: "700" }}>
                    {k.progress_percentage !== null ? `${k.progress_percentage}%` : "Uncalculated"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", fontSize: "12px", color: "#cbd5e1", lineHeight: "1.4", maxHeight: "120px", overflowY: "auto" }}>
            <span style={{ fontWeight: "700", color: "#38bdf8", display: "block", marginBottom: "4px" }}>🤖 AI Performance Summary</span>
            {brief.kpi_progress.performance_summary || "Performance summary generated."}
          </div>
        </div>

        {/* Card 4: Financial Breakdown */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px", backdropFilter: "blur(12px)" }}>
          <h2 style={{ fontSize: "18px", color: "#f59e0b", marginTop: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            💰 4. Pilot Financials & Milestone History
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px", borderRadius: "8px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Pilot Budget</span>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>₹{brief.financial_breakdown.pilot_budget.toLocaleString()}</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px", borderRadius: "8px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Total Paid</span>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#34d399" }}>₹{brief.financial_breakdown.total_paid.toLocaleString()}</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px", borderRadius: "8px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Pending</span>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#f59e0b" }}>₹{brief.financial_breakdown.total_pending.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ maxHeight: "120px", overflowY: "auto" }}>
            {brief.financial_breakdown.milestones.map((m: any) => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "12px" }}>
                <span>{m.title}</span>
                <span style={{ color: m.status === "paid" ? "#34d399" : "#cbd5e1" }}>
                  ₹{m.payment_amount.toLocaleString()} ({m.status.toUpperCase()})
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Procurement Decision Workbench */}
      <div style={{ background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "28px" }}>
        <h2 style={{ fontSize: "20px", color: "#f8fafc", marginTop: 0, marginBottom: "20px" }}>
          ⚖️ Procurement Decision Workbench
        </h2>

        {activeDecision ? (
          <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "20px", borderRadius: "10px", border: "1px solid #3b82f6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "16px", fontWeight: "700", color: "#60a5fa" }}>
                PENDING PROPOSAL: {activeDecision.decision.toUpperCase()}
              </span>
              <span style={{ fontSize: "12px", padding: "4px 10px", background: "rgba(245, 158, 11, 0.2)", color: "#f59e0b", borderRadius: "12px", border: "1px solid #f59e0b" }}>
                Status: {activeDecision.status.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: "14px", color: "#cbd5e1", marginBottom: "12px" }}>
              <strong>Justification:</strong> {activeDecision.justification}
            </p>
            {activeDecision.decision === "scale_up" && (
              <div style={{ fontSize: "14px", color: "#34d399", marginBottom: "12px" }}>
                <strong>Proposed Contract Value:</strong> ₹{activeDecision.contract_value?.toLocaleString()}
              </div>
            )}
            {activeDecision.decision === "extend_pilot" && (
              <div style={{ fontSize: "14px", color: "#fbbf24", marginBottom: "12px" }}>
                <strong>Extended End Date:</strong> {activeDecision.extended_end_date}
              </div>
            )}

            {isSuperAdmin ? (
              <div style={{ display: "flex", gap: "16px", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  style={{ padding: "10px 24px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                >
                  ✓ Approve Decision (Finalize)
                </button>
                <button
                  onClick={() => setShowSendBackModal(true)}
                  disabled={submitting}
                  style={{ padding: "10px 24px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                >
                  ↩ Send Back to Officer
                </button>
              </div>
            ) : (
              <p style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic", marginTop: "12px" }}>
                Proposal is currently pending Super Admin review & maker-checker sign-off.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleProposeSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Procurement Decision</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                >
                  <option value="scale_up">Scale-Up (Commercial Contract)</option>
                  <option value="reject">Reject Solution</option>
                  <option value="extend_pilot">Extend Pilot Term</option>
                  <option value="terminate">Terminate Project</option>
                </select>
              </div>

              {decision === "scale_up" && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Scale-Up Contract Value (₹)</label>
                  <input
                    type="number"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    placeholder="e.g. 5000000.00"
                    style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              )}

              {decision === "extend_pilot" && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Extended End Date</label>
                  <input
                    type="date"
                    value={extendedEndDate}
                    onChange={(e) => setExtendedEndDate(e.target.value)}
                    style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Justification & Rationale</label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Detail technical accuracy, KPI achievement metrics, and operational readiness..."
                style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ alignSelf: "flex-start", padding: "10px 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
            >
              {submitting ? "Submitting..." : "Submit Procurement Proposal →"}
            </button>
          </form>
        )}
      </div>

      {/* Send Back Modal */}
      {showSendBackModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#1e293b", padding: "24px", borderRadius: "12px", width: "450px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ marginTop: 0, color: "#ef4444" }}>Send Back Procurement Decision</h3>
            <p style={{ fontSize: "13px", color: "#cbd5e1" }}>Provide required feedback notes explaining why the proposal is sent back to the officer.</p>
            <textarea
              rows={4}
              value={sendBackComments}
              onChange={(e) => setSendBackComments(e.target.value)}
              placeholder="Comments on budget, contract value or KPI progress..."
              style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff", marginBottom: "16px" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowSendBackModal(false)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #94a3b8", color: "#94a3b8", borderRadius: "6px", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSendBack} style={{ padding: "8px 16px", background: "#ef4444", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                Confirm Send-Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
