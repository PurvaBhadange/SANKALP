"use me";
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";

export default function ChallengeLifecyclePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (challengeId) {
      loadData();
    }
  }, [challengeId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/challenges/${challengeId}/lifecycle-summary`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Failed to load lifecycle summary.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "40px", color: "#fff", background: "#0a0d14", minHeight: "100vh" }}>
        <h2>Loading Challenge Lifecycle Story...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", color: "#fff", background: "#0a0d14", minHeight: "100vh" }}>
        <div style={{ padding: "20px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", maxWidth: "600px" }}>
          <h3 style={{ color: "#ef4444", marginTop: 0 }}>Lifecycle Summary Error</h3>
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
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <button onClick={() => router.back()} style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontSize: "14px", marginBottom: "8px" }}>
            ← Back
          </button>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#f8fafc", margin: 0 }}>
            End-to-End Innovation Lifecycle Story
          </h1>
          <p style={{ color: "#94a3b8", margin: "4px 0 0 0", fontSize: "14px" }}>
            Consolidated timeline tracking problem definition to procurement outcome.
          </p>
        </div>
        <span style={{ padding: "6px 16px", borderRadius: "20px", background: summary.status === "closed" ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.2)", color: summary.status === "closed" ? "#10b981" : "#60a5fa", border: summary.status === "closed" ? "1px solid #10b981" : "1px solid #3b82f6", fontSize: "13px", fontWeight: "700" }}>
          CHALLENGE STATUS: {summary.status.toUpperCase()}
        </span>
      </div>

      {/* Story Timeline Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Stage 1: Problem Definition */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px" }}>
          <div style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>STAGE 1 (MODULE 2)</div>
          <h2 style={{ fontSize: "20px", color: "#f8fafc", margin: "4px 0 16px 0" }}>{summary.title}</h2>
          <p style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: "1.5" }}>{summary.problem_statement}</p>
          {summary.structured_outcomes && (
            <div style={{ marginTop: "16px", background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "8px" }}>
              <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "700" }}>🤖 AI Structured Scope</span>
              <p style={{ fontSize: "13px", color: "#cbd5e1", margin: "4px 0 0 0" }}>{summary.structured_outcomes.scope || "AI structured outcomes recorded."}</p>
            </div>
          )}
        </div>

        {/* Stage 2: Eligibility Breakdown */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px" }}>
          <div style={{ fontSize: "12px", color: "#a855f7", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>STAGE 2 (MODULE 4)</div>
          <h2 style={{ fontSize: "18px", color: "#f8fafc", margin: "4px 0 16px 0" }}>Application Submissions & Eligibility Verification</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "8px" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Total Applications</span>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#f8fafc" }}>{summary.eligibility_summary.total_applications}</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "8px" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Shortlisted</span>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#34d399" }}>{summary.eligibility_summary.shortlisted_count}</div>
            </div>
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "8px" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Rejected</span>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#f87171" }}>{summary.eligibility_summary.rejected_count}</div>
            </div>
          </div>
        </div>

        {/* Stage 3: Panel Evaluation Rankings */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px" }}>
          <div style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>STAGE 3 (MODULE 5)</div>
          <h2 style={{ fontSize: "18px", color: "#f8fafc", margin: "4px 0 16px 0" }}>Expert Panel Evaluation Rankings</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {summary.evaluation_summary.rankings.map((r: any, idx: number) => (
              <div key={r.application_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(15, 23, 42, 0.6)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <span style={{ fontWeight: "700", color: "#c084fc" }}>Rank #{idx + 1}</span>
                  <span style={{ marginLeft: "12px", color: "#f1f5f9", fontWeight: "600" }}>{r.startup_name}</span>
                </div>
                <div style={{ color: "#34d399", fontWeight: "700" }}>
                  Weighted Score: {r.weighted_final_score} / 100
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 4: Pilots & Decisions */}
        <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px" }}>
          <div style={{ fontSize: "12px", color: "#10b981", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>STAGE 4 & 5 (MODULES 6, 7 & 8)</div>
          <h2 style={{ fontSize: "18px", color: "#f8fafc", margin: "4px 0 16px 0" }}>Pilot Projects & Procurement Decisions</h2>

          {summary.pilots.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>No active or completed pilots for this challenge.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {summary.pilots.map((p: any) => (
                <div key={p.pilot_id} style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                      Startup: {p.startup_name}
                    </span>
                    <button onClick={() => router.push(`/pilots/${p.pilot_id}/decision`)} style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                      Open Decision Brief →
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", fontSize: "13px", marginBottom: "12px", color: "#cbd5e1" }}>
                    <div>Status: <strong>{p.status.toUpperCase()}</strong></div>
                    <div>Budget: <strong>₹{p.budget ? p.budget.toLocaleString() : "N/A"}</strong></div>
                    <div>Milestones Paid: <strong>{p.milestones_paid_count} / {p.milestones_count}</strong></div>
                  </div>

                  {p.decisions.length > 0 && (
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "700", display: "block", marginBottom: "8px" }}>Procurement Decision History</span>
                      {p.decisions.map((d: any) => (
                        <div key={d.id} style={{ background: "rgba(30, 41, 59, 0.5)", padding: "8px 12px", borderRadius: "6px", marginBottom: "6px", fontSize: "12px" }}>
                          <span style={{ fontWeight: "700", color: d.status === "approved" ? "#34d399" : "#f59e0b" }}>
                            [{d.status.toUpperCase()}] {d.decision.toUpperCase()}
                          </span>
                          <p style={{ margin: "2px 0", color: "#cbd5e1" }}>Justification: {d.justification}</p>
                          {d.contract_value && <span style={{ color: "#34d399" }}>Contract Value: ₹{d.contract_value.toLocaleString()}</span>}
                          {d.comments && <p style={{ margin: "2px 0", color: "#f87171" }}>Comments: {d.comments}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
