"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getCookie } from "cookies-next";
import { 
  ArrowLeft, Building2, CheckCircle2, Clock, XCircle, Sparkles, 
  Play, ShieldAlert, Loader2, ShieldCheck, FileCheck, AlertTriangle
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

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
    const token = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
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
    const token = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
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
    const token = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
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
    const token = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
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
    const token = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
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
    const token = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
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
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 pb-16 font-sans bg-halftone">
      <Navbar />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-6">
          <div className="flex items-center gap-3">
            <Link
              href={`/challenges/${id}`}
              className="p-2 rounded-xl bg-white border-2 border-black text-black hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000] transition-all"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3px]" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight font-display uppercase flex items-center gap-2">
                <Building2 className="w-6 h-6 text-black stroke-[3px]" /> Applicant Screening Workbench
              </h1>
              <p className="text-xs text-black font-bold font-mono mt-0.5 uppercase">
                {challenge ? challenge.title : "Challenge Applications"}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FF6B6B] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0 stroke-[3px]" />
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
            <p className="text-xs uppercase">Loading applicants and screening state...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white p-12 text-center border-4 border-black shadow-[8px_8px_0px_0px_#000] space-y-3">
            <Building2 className="w-12 h-12 text-black mx-auto stroke-[3px]" />
            <h3 className="text-base font-black text-black font-display uppercase">No Applications Received Yet</h3>
            <p className="text-black text-xs font-bold uppercase">Startups have not yet submitted applications to this published challenge.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((app) => {
              const allPassedOrWaived = app.eligibility_results && app.eligibility_results.length > 0 && 
                app.eligibility_results.every((r: any) => r.final_passed === true || r.waived === true);

              return (
                <div key={app.id} className="bg-white border-4 border-black p-6 space-y-6 shadow-[8px_8px_0px_0px_#000]">
                  {/* Top Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-lg text-black uppercase">{app.startup?.name || "Startup Name"}</span>
                        <span className="text-xs font-mono font-bold text-black bg-[#FFFDF5] px-2 py-0.5 border border-black">
                          {app.startup?.registration_number}
                        </span>
                        <span className={`status-pill ${app.status === "shortlisted" || app.status === "selected" ? "status-published" : "status-pending"}`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="text-xs text-black font-bold mt-1 font-mono uppercase">
                        Sector: {app.startup?.sector?.name || "N/A"} | Team Size: {app.startup?.team_size || "N/A"} | Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {app.ai_match_score !== null && (
                        <div className="flex items-center gap-2 bg-[#86EFAC] border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_#000]">
                          <Sparkles className="w-4 h-4 text-black stroke-[3px]" />
                          <span className="text-xs font-black text-black font-mono">{Number(app.ai_match_score).toFixed(1)}% Match</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleRunEligibilityCheck(app.id)}
                        disabled={actionLoading === `check-${app.id}`}
                        className="gov-btn-primary text-xs"
                      >
                        {actionLoading === `check-${app.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />
                        ) : (
                          <Play className="w-4 h-4 fill-black stroke-[3px]" />
                        )}
                        <span>Run Screening</span>
                      </button>
                    </div>
                  </div>

                  {/* Dual-Layer Screening Breakdown Table */}
                  {app.eligibility_results && app.eligibility_results.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-black uppercase tracking-widest flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-black stroke-[3px]" />
                        Dual-Layer Screening Matrix
                      </h4>

                      <div className="overflow-x-auto border-2 border-black">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#FFD93D] text-black uppercase font-black text-[10px] border-b-2 border-black">
                            <tr>
                              <th className="p-3">Criteria Key</th>
                              <th className="p-3">Layer 1 (Rules)</th>
                              <th className="p-3">Layer 2 (AI Doc Verification)</th>
                              <th className="p-3">Final Passed</th>
                              <th className="p-3">Reviewed By</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black font-bold">
                            {app.eligibility_results.map((r: any) => {
                              const needsReview = r.final_passed === null && !r.waived;

                              return (
                                <tr key={r.id} className="hover:bg-[#FFFDF5]">
                                  <td className="p-3 font-mono font-black text-black">
                                    {r.criteria?.criteria_key}
                                  </td>
                                  <td className="p-3">
                                    {r.rules_engine_passed ? (
                                      <span className="text-black font-black bg-[#86EFAC] px-1.5 py-0.5 border border-black">✓ Pass</span>
                                    ) : (
                                      <span className="text-black font-black bg-[#FF6B6B] px-1.5 py-0.5 border border-black">✗ Fail</span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {r.ai_verification_passed === true ? (
                                      <span className="text-black font-black bg-[#86EFAC] px-1.5 py-0.5 border border-black">✓ Verified</span>
                                    ) : r.ai_verification_passed === false ? (
                                      <span className="text-black font-black bg-[#FF6B6B] px-1.5 py-0.5 border border-black">✗ Document Failed</span>
                                    ) : (
                                      <span className="text-slate-500 italic">N/A</span>
                                    )}
                                  </td>
                                  <td className="p-3 font-mono">
                                    {r.waived ? (
                                      <span className="px-2 py-0.5 bg-[#FFD93D] text-black border border-black font-black text-[10px]">
                                        Waived
                                      </span>
                                    ) : r.final_passed === true ? (
                                      <span className="px-2 py-0.5 bg-[#86EFAC] text-black border border-black font-black text-[10px]">
                                        Passed
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-[#FF6B6B] text-black border border-black font-black text-[10px] inline-flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 stroke-[3px]" /> Needs Human Review
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-black font-mono text-[10px]">
                                    {r.checker ? r.checker.full_name : "Automated"}
                                  </td>
                                  <td className="p-3 text-right space-x-2">
                                    {needsReview && (
                                      <>
                                        <button
                                          onClick={() => handlePassCriteriaHuman(app.id, r.criteria_id)}
                                          className="gov-btn-primary text-[10px] py-1 px-2"
                                        >
                                          Pass
                                        </button>
                                        <button
                                          onClick={() => setWaiverTarget({ appId: app.id, critId: r.criteria_id, critKey: r.criteria?.criteria_key })}
                                          className="gov-btn-secondary text-[10px] py-1 px-2"
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
                    <p className="text-xs text-black font-bold uppercase bg-[#FFD93D] p-3 border-2 border-black">
                      Eligibility check has not been executed yet. Click "Run Screening" to evaluate eligibility.
                    </p>
                  )}

                  {/* Actions Footer */}
                  <div className="flex justify-end items-center gap-3 border-t-2 border-black pt-4">
                    <button
                      onClick={() => setRejectAppId(app.id)}
                      className="gov-btn-secondary text-xs"
                    >
                      Reject Application
                    </button>

                    {app.status === "shortlisted" && (
                      <button
                        onClick={async () => {
                          setActionLoading(`pilot-${app.id}`);
                          setError(null);
                          setSuccessMsg(null);
                          const token = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
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
                        className="gov-btn-primary text-xs flex items-center gap-1.5"
                      >
                        {actionLoading === `pilot-${app.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />
                        ) : (
                          <Sparkles className="w-4 h-4 fill-black stroke-[3px]" />
                        )}
                        <span>Select for Pilot</span>
                      </button>
                    )}

                    {app.status !== "shortlisted" && app.status !== "selected" && (
                      <button
                        onClick={() => handleShortlist(app.id)}
                        disabled={!allPassedOrWaived || actionLoading === `shortlist-${app.id}`}
                        className="gov-btn-primary text-xs flex items-center gap-1.5"
                      >
                        {actionLoading === `shortlist-${app.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 stroke-[3px]" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full space-y-4 shadow-[12px_12px_0px_0px_#000]">
            <h3 className="text-base font-black text-black font-display uppercase">Apply Criteria Waiver</h3>
            <p className="text-xs text-black font-bold uppercase">
              Provide an official waiver justification for criteria: <span className="font-mono bg-[#FFD93D] px-1 border border-black">{waiverTarget.critKey}</span>
            </p>

            <textarea
              rows={3}
              value={waiverJustification}
              onChange={(e) => setWaiverJustification(e.target.value)}
              placeholder="State regulatory justification or executive waiver reason..."
              className="w-full p-3 bg-white border-2 border-black text-xs font-bold text-black focus:outline-none focus:bg-[#FFFDF5]"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setWaiverTarget(null)}
                className="gov-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyWaiver}
                disabled={!waiverJustification.trim()}
                className="gov-btn-primary text-xs"
              >
                Confirm Waiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full space-y-4 shadow-[12px_12px_0px_0px_#000]">
            <h3 className="text-base font-black text-black font-display uppercase">Reject Application</h3>
            <p className="text-xs text-black font-bold uppercase">Specify reason for rejecting candidate application:</p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Startup does not satisfy minimum turnover and security eligibility constraints."
              className="w-full p-3 bg-white border-2 border-black text-xs font-bold text-black focus:outline-none focus:bg-[#FFFDF5]"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectAppId(null)}
                className="gov-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="gov-btn-primary text-xs"
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
