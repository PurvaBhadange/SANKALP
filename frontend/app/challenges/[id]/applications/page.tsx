"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getCookie } from "cookies-next";
import { 
  ArrowLeft, Building2, CheckCircle2, Clock, XCircle, Sparkles, 
  Play, ShieldAlert, Loader2, ShieldCheck, FileCheck, AlertTriangle
} from "lucide-react";

export default function ChallengeApplicationsPage() {
  const { id } = useParams();
  const [challenge, setChallenge] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Waiver Modal State
  const [waiverTarget, setWaiverTarget] = useState<{ appId: string; critId: string; critKey: string } | null>(null);
  const [waiverJustification, setWaiverJustification] = useState("");

  // Reject Modal State
  const [rejectAppId, setRejectAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const router = useRouter();

  const fetchChallengeAndApps = async () => {
    setLoading(true);
    setError(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      // Fetch challenge details
      const chRes = await fetch(`${apiUrl}/challenges/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (chRes.ok) {
        setChallenge(await chRes.json());
      }

      // Fetch applications
      const appRes = await fetch(`${apiUrl}/challenges/${id}/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (appRes.ok) {
        setApplications(await appRes.json());
      } else {
        const err = await appRes.json().catch(() => ({}));
        setError(err.detail || "Failed to load challenge applications.");
      }
    } catch (e: any) {
      setError("Network error loading applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallengeAndApps();
  }, [id]);

  const handleRunEligibilityCheck = async (appId: string) => {
    setActionLoading(`check-${appId}`);
    setError(null);
    setSuccessMsg(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/applications/${appId}/run-eligibility-check`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg("Eligibility check executed successfully!");
        fetchChallengeAndApps();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to run eligibility check.");
      }
    } catch (e: any) {
      setError("Network error executing eligibility check.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplyWaiver = async () => {
    if (!waiverTarget || !waiverJustification.trim()) return;
    setActionLoading(`waiver-${waiverTarget.critId}`);
    setError(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/applications/${waiverTarget.appId}/eligibility/${waiverTarget.critId}`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          waived: true,
          waiver_justification: waiverJustification
        })
      });
      if (res.ok) {
        setWaiverTarget(null);
        setWaiverJustification("");
        setSuccessMsg("Criteria waiver recorded successfully!");
        fetchChallengeAndApps();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to apply waiver.");
      }
    } catch (e: any) {
      setError("Network error applying waiver.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePassCriteriaHuman = async (appId: string, critId: string) => {
    setActionLoading(`pass-${critId}`);
    setError(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/applications/${appId}/eligibility/${critId}`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ final_passed: true })
      });
      if (res.ok) {
        setSuccessMsg("Criteria marked as Passed by officer.");
        fetchChallengeAndApps();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to pass criteria.");
      }
    } catch (e: any) {
      setError("Network error passing criteria.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleShortlist = async (appId: string) => {
    setActionLoading(`shortlist-${appId}`);
    setError(null);
    setSuccessMsg(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/applications/${appId}/shortlist`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg("Application shortlisted successfully!");
        fetchChallengeAndApps();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Shortlisting blocked: unresolved eligibility criteria exist.");
      }
    } catch (e: any) {
      setError("Network error shortlisting application.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectAppId || !rejectReason.trim()) return;
    setActionLoading(`reject-${rejectAppId}`);
    setError(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/applications/${rejectAppId}/reject`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (res.ok) {
        setRejectAppId(null);
        setRejectReason("");
        setSuccessMsg("Application rejected.");
        fetchChallengeAndApps();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to reject application.");
      }
    } catch (e: any) {
      setError("Network error rejecting application.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Header Banner */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/challenges/${id}`}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Applicant Screening Workbench</h1>
              <p className="text-xs text-slate-400">
                {challenge ? challenge.title : "Challenge Applications"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm">Loading applicants and screening state...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Applications Received Yet</h3>
            <p className="text-slate-400 text-xs">Startups have not yet submitted applications to this published challenge.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((app) => {
              const allPassedOrWaived = app.eligibility_results && app.eligibility_results.length > 0 && 
                app.eligibility_results.every((r: any) => r.final_passed === true || r.waived === true);

              return (
                <div key={app.id} className="glass-card rounded-2xl p-6 space-y-6 border border-slate-800">
                  {/* Top Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-white">{app.startup?.name || "Startup Name"}</span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {app.startup?.registration_number}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {app.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Sector: {app.startup?.sector?.name || "N/A"} | Team Size: {app.startup?.team_size || "N/A"} | Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {app.ai_match_score !== null && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-400">{Number(app.ai_match_score).toFixed(1)}% Match</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleRunEligibilityCheck(app.id)}
                        disabled={actionLoading === `check-${app.id}`}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10"
                      >
                        {actionLoading === `check-${app.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 fill-white" />
                        )}
                        <span>Run Screening</span>
                      </button>
                    </div>
                  </div>

                  {/* Dual-Layer Screening Breakdown Table */}
                  {app.eligibility_results && app.eligibility_results.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-indigo-400" />
                        Dual-Layer Screening Matrix
                      </h4>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-800">
                            <tr>
                              <th className="p-3">Criteria Key</th>
                              <th className="p-3">Layer 1 (Rules)</th>
                              <th className="p-3">Layer 2 (AI Doc Verification)</th>
                              <th className="p-3">Final Passed</th>
                              <th className="p-3">Reviewed By</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {app.eligibility_results.map((r: any) => {
                              const needsReview = r.final_passed === null && !r.waived;

                              return (
                                <tr key={r.id} className="hover:bg-slate-900/40">
                                  <td className="p-3 font-mono font-bold text-white">
                                    {r.criteria?.criteria_key}
                                  </td>
                                  <td className="p-3">
                                    {r.rules_engine_passed ? (
                                      <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Pass</span>
                                    ) : (
                                      <span className="text-rose-400 font-bold flex items-center gap-1">✗ Fail</span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {r.ai_verification_passed === true ? (
                                      <span className="text-emerald-400 font-bold">✓ Verified</span>
                                    ) : r.ai_verification_passed === false ? (
                                      <span className="text-rose-400 font-bold">✗ Document Failed</span>
                                    ) : (
                                      <span className="text-slate-500 italic">N/A</span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {r.waived ? (
                                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold text-[10px]">
                                        Waived
                                      </span>
                                    ) : r.final_passed === true ? (
                                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                                        Passed
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-[10px] flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Needs Human Review
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-slate-400 font-mono text-[10px]">
                                    {r.checker ? r.checker.full_name : "Automated"}
                                  </td>
                                  <td className="p-3 text-right space-x-2">
                                    {needsReview && (
                                      <>
                                        <button
                                          onClick={() => handlePassCriteriaHuman(app.id, r.criteria_id)}
                                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold rounded-lg text-[10px] transition-all border border-emerald-500/30"
                                        >
                                          Pass
                                        </button>
                                        <button
                                          onClick={() => setWaiverTarget({ appId: app.id, critId: r.criteria_id, critKey: r.criteria?.criteria_key })}
                                          className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-bold rounded-lg text-[10px] transition-all border border-amber-500/30"
                                        >
                                          Waive
                                        </button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                      Eligibility check has not been executed yet. Click "Run Screening" to evaluate eligibility.
                    </p>
                  )}

                  {/* Actions Footer */}
                  <div className="flex justify-end items-center gap-3 border-t border-slate-800 pt-4">
                    <button
                      onClick={() => setRejectAppId(app.id)}
                      className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/30 transition-all"
                    >
                      Reject Application
                    </button>

                    {app.status === "shortlisted" && (
                      <button
                        onClick={async () => {
                          setActionLoading(`pilot-${app.id}`);
                          setError(null);
                          setSuccessMsg(null);
                          const token = getCookie("token");
                          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                          try {
                            const res = await fetch(`${apiUrl}/applications/${app.id}/select-for-pilot`, {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            if (res.ok) {
                              const pData = await res.json();
                              setSuccessMsg("Application selected for pilot project deployment!");
                              fetchChallengeAndApps();
                            } else {
                              const err = await res.json().catch(() => ({}));
                              setError(err.detail || "Failed to select for pilot.");
                            }
                          } catch (e) {
                            setError("Network error selecting application for pilot.");
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        disabled={actionLoading === `pilot-${app.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20"
                      >
                        {actionLoading === `pilot-${app.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 fill-white" />
                        )}
                        <span>Select for Pilot</span>
                      </button>
                    )}

                    {app.status !== "shortlisted" && app.status !== "selected" && (
                      <button
                        onClick={() => handleShortlist(app.id)}
                        disabled={!allPassedOrWaived || actionLoading === `shortlist-${app.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                      >
                        {actionLoading === `shortlist-${app.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>Shortlist Candidate</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Waiver Justification Modal */}
      {waiverTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-md w-full rounded-2xl p-6 space-y-4 border border-slate-700 shadow-2xl">
            <h3 className="text-base font-bold text-white">Apply Criteria Waiver</h3>
            <p className="text-xs text-slate-400">
              Provide an official waiver justification for criteria: <span className="font-mono text-indigo-400">{waiverTarget.critKey}</span>
            </p>

            <textarea
              rows={3}
              value={waiverJustification}
              onChange={(e) => setWaiverJustification(e.target.value)}
              placeholder="State regulatory justification or executive waiver reason..."
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setWaiverTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyWaiver}
                disabled={!waiverJustification.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
              >
                Confirm Waiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-md w-full rounded-2xl p-6 space-y-4 border border-slate-700 shadow-2xl">
            <h3 className="text-base font-bold text-white">Reject Application</h3>
            <p className="text-xs text-slate-400">Specify reason for rejecting candidate application:</p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Startup does not satisfy minimum turnover and security eligibility constraints."
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectAppId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
