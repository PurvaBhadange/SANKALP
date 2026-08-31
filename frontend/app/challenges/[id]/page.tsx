"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getCookie } from "cookies-next";
import { 
  ArrowLeft, BrainCircuit, Loader2, Save, Send, CheckCircle, 
  XCircle, Plus, Calendar, Badge, ShieldAlert, Award, Sparkles, Building2
} from "lucide-react";

interface Criteria {
  id: string;
  criteria_key: string;
  criteria_value_json: any;
  is_waivable: boolean;
  waiver_reason_required: boolean;
}

interface ApprovalStep {
  id: string;
  status: string;
  comments: string | null;
  decided_at: string | null;
}

interface StatusHistory {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  remarks: string | null;
}

interface Challenge {
  id: string;
  created_by?: string;
  title: string;
  raw_problem_text: string;
  status: string;
  budget_ceiling: number | null;
  currency: string;
  timeline_start: string | null;
  timeline_end: string | null;
  structured_outcome_json: any;
  ai_structuring_metadata: any;
  sector?: { name: string };
  criteria: Criteria[];
  approval_steps: ApprovalStep[];
  status_history: StatusHistory[];
}

export default function ChallengeDetail() {
  const { id } = useParams();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Edit Structured Outcome State
  const [editableJson, setEditableJson] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  // New Criteria Form State
  const [critKey, setCritKey] = useState("min_turnover");
  const [critVal, setCritVal] = useState("");
  const [isWaivable, setIsWaivable] = useState(true);
  const [waiverReq, setWaiverReq] = useState(true);

  // Rejection State
  const [rejectComments, setRejectComments] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Matching Startups State
  const [matchingStartups, setMatchingStartups] = useState<any[]>([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingErr, setMatchingErr] = useState<string | null>(null);

  // Application State
  const [hasApplied, setHasApplied] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const router = useRouter();

  const fetchChallengeData = async () => {
    const token = getCookie("access_token") || localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      // Load user profile
      const profRes = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profRes.ok) {
        const u = await profRes.json();
        setUser(u);
      }

      // Load challenge details
      const res = await fetch(`${apiUrl}/challenges/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("Challenge not found or access denied.");
      }

      const data = await res.json();
      setChallenge(data);
      setEditableJson(data.structured_outcome_json ? JSON.stringify(data.structured_outcome_json, null, 2) : "");

      if (data.status === "published") {
        fetchMatchingStartups(token, apiUrl, id as string);
        fetchStartupApplicationState(token, apiUrl, id as string);
      }
    } catch (err: any) {
      setError(err.message || "Could not retrieve details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchingStartups = async (token: string, apiUrl: string, chalId: string) => {
    setMatchingLoading(true);
    setMatchingErr(null);
    try {
      const res = await fetch(`${apiUrl}/challenges/${chalId}/matching-startups?top_k=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMatchingStartups(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setMatchingErr(errData.detail || "Matching unavailable.");
      }
    } catch (e: any) {
      setMatchingErr("Failed to load matching startups.");
    } finally {
      setMatchingLoading(false);
    }
  };

  const fetchStartupApplicationState = async (token: string, apiUrl: string, chalId: string) => {
    try {
      const res = await fetch(`${apiUrl}/startups/me/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const apps = await res.json();
        if (apps.some((a: any) => a.challenge_id === chalId)) {
          setHasApplied(true);
        }
      }
    } catch (e) {}
  };

  const handleApplyChallenge = async () => {
    setApplyLoading(true);
    setError(null);
    const token = getCookie("token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/challenges/${id}/applications`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setHasApplied(true);
        setApplySuccess(true);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to submit application.");
      }
    } catch (e: any) {
      setError("Network error submitting application.");
    } finally {
      setApplyLoading(false);
    }
  };

  useEffect(() => {
    fetchChallengeData();
  }, [id, router]);

  const handleAiStructure = async () => {
    setError(null);
    setActionLoading(true);
    const token = getCookie("access_token") || localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/challenges/${id}/structure`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "AI structuring call failed.");
      }

      const updated = await res.json();
      setChallenge(updated);
      setEditableJson(JSON.stringify(updated.structured_outcome_json, null, 2));
    } catch (err: any) {
      setError(err.message || "AI structuring temporarily unavailable.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveManualEdit = async () => {
    setError(null);
    setEditSuccess(false);
    const token = getCookie("access_token") || localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      let parsedJson = null;
      try {
        parsedJson = editableJson.trim() ? JSON.parse(editableJson) : null;
      } catch (e) {
        throw new Error("Invalid JSON syntax. Please double check brackets and commas.");
      }

      const res = await fetch(`${apiUrl}/challenges/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          structured_outcome_json: parsedJson
        })
      });

      if (!res.ok) {
        throw new Error("Failed to save edits.");
      }

      const updated = await res.json();
      setChallenge(updated);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Could not save manual edit.");
    }
  };

  const handleAddCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = getCookie("access_token") || localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      let parsedVal = critVal;
      try {
        parsedVal = JSON.parse(critVal);
      } catch (e) {
        // Treat as string/value if not valid JSON
      }

      const payload = [{
        criteria_key: critKey,
        criteria_value_json: typeof parsedVal === "object" ? parsedVal : { value: parsedVal },
        is_waivable: isWaivable,
        waiver_reason_required: waiverReq
      }];

      const res = await fetch(`${apiUrl}/challenges/${id}/eligibility-criteria`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Could not add criteria.");

      setCritVal("");
      fetchChallengeData();
    } catch (err: any) {
      setError(err.message || "Failed to add criteria.");
    }
  };

  const handleSubmitApproval = async () => {
    setError(null);
    setActionLoading(true);
    const token = getCookie("access_token") || localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/challenges/${id}/submit-for-approval`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to submit.");
      fetchChallengeData();
    } catch (err: any) {
      setError(err.message || "Failed to submit.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setError(null);
    setActionLoading(true);
    const token = getCookie("access_token") || localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/challenges/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Approval rejected by server.");
      fetchChallengeData();
    } catch (err: any) {
      setError(err.message || "Could not publish challenge.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setError(null);
    if (rejectComments.trim() === "") {
      setError("Please specify rejection reasons.");
      return;
    }
    setActionLoading(true);
    const token = getCookie("access_token") || localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/challenges/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comments: rejectComments })
      });

      if (!res.ok) throw new Error("Rejection failed.");
      setShowRejectForm(false);
      setRejectComments("");
      fetchChallengeData();
    } catch (err: any) {
      setError(err.message || "Failed to reject challenge.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-400 font-medium">Retrieving workspace...</p>
        </div>
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md glass-card rounded-2xl p-8 text-center text-white">
          <h2 className="text-xl font-bold text-red-400 mb-3">Load Error</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <Link href="/challenges" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all">
            Back to Challenges
          </Link>
        </div>
      </div>
    );
  }

  if (!challenge) return null;

  const isCreator = user && challenge.created_by === user.id;
  const isAdmin = user && user.roles.some((r: any) => r.name === "SUPER_ADMIN");

  return (
    <div className="min-h-screen bg-slate-950 text-white relative pb-20">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-indigo-900/10 blur-[128px]"></div>
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-blue-900/10 blur-[128px]"></div>

      {/* Navigation */}
      <nav className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/challenges" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-bold text-lg text-white">Challenge workspace</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700/60">
              {challenge.status.replace("_", " ")}
            </span>
          </div>
        </div>
      </nav>

      {/* Container */}
      <main className="max-w-6xl mx-auto px-4 py-12 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Challenge Info & Status Workflow */}
        <div className="lg:col-span-2 space-y-8">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Heading */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-extrabold text-white sm:text-3xl leading-snug">
                {challenge.title}
              </h1>
            </div>
            
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-400">
              <span className="bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-xl border border-indigo-500/20">
                {challenge.sector?.name || "Other"}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Timeline: {challenge.timeline_start ? challenge.timeline_start : "No Start"} to {challenge.timeline_end ? challenge.timeline_end : "No End"}
              </span>
              <span className="bg-indigo-600/10 text-indigo-300 px-3 py-1 rounded-xl border border-indigo-500/20">
                Budget Limit: {challenge.budget_ceiling ? `${challenge.currency} ${new Intl.NumberFormat().format(challenge.budget_ceiling)}` : "Not set"}
              </span>
            </div>

            <div className="border-t border-slate-800/80 pt-6">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Raw Problem Statement</h2>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {challenge.raw_problem_text}
              </p>
            </div>
          </div>

          {/* AI Structuring section */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-400" />
                  AI Structuring Workspace
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Structure measurable outcomes, scope, suggested KPIs and constraints.
                </p>
              </div>
              {challenge.status === "draft" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleAiStructure}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                  <span>Run AI Structuring</span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Structured outcomes data (JSON Format)
              </label>
              <textarea
                rows={12}
                value={editableJson}
                disabled={challenge.status !== "draft"}
                onChange={(e) => setEditableJson(e.target.value)}
                placeholder='Click "Run AI Structuring" or paste custom structured outcomes JSON here...'
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-300 placeholder-slate-600 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all leading-relaxed"
              />
              
              {challenge.status === "draft" && (
                <div className="flex items-center gap-3 mt-3 justify-end">
                  {editSuccess && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Edits Saved.
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveManualEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-all border border-slate-700/60"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Structured Outcomes
                  </button>
                </div>
              )}
            </div>

            {challenge.ai_structuring_metadata && (
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/60 text-[10px] text-slate-500 font-mono space-y-1">
                <p>AI Engine: {challenge.ai_structuring_metadata.model_name}</p>
                <p>Generated At: {new Date(challenge.ai_structuring_metadata.timestamp).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Criteria Setup & Status Logs */}
        <div className="space-y-8">
          
          {/* Action Center (Approval state transitions) */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800/80 pb-2">
              Action Center
            </h3>
            
            {challenge.status === "draft" && (isCreator || isAdmin) && (
              <button
                type="button"
                onClick={handleSubmitApproval}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/10"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit for Department Approval
              </button>
            )}

            {challenge.status === "published" && user?.roles?.some((r: any) => r.name === "STARTUP_USER") && (
              <div className="space-y-3">
                {hasApplied ? (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1">
                    <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Application Submitted
                    </p>
                    <Link
                      href="/startup/applications"
                      className="text-[11px] text-indigo-400 hover:underline font-semibold block"
                    >
                      View in My Applications ➔
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyChallenge}
                    disabled={applyLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10"
                  >
                    {applyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Apply for Challenge</span>
                  </button>
                )}
              </div>
            )}

            {challenge.status === "published" && user?.roles?.some((r: any) => ["DEPARTMENT_OFFICER", "SUPER_ADMIN"].includes(r.name)) && (
              <Link
                href={`/challenges/${id}/applications`}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/10"
              >
                <Award className="w-4 h-4" />
                <span>Review Applicants & Screening</span>
              </Link>
            )}

            {challenge.status === "pending_approval" && isAdmin && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve and Publish
                </button>
                
                {!showRejectForm ? (
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-red-400 text-sm font-semibold rounded-xl transition-all border border-slate-700/60"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject to Draft
                  </button>
                ) : (
                  <div className="space-y-2 border-t border-slate-800/80 pt-3">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                      Reason for Rejection
                    </label>
                    <textarea
                      rows={3}
                      value={rejectComments}
                      onChange={(e) => setRejectComments(e.target.value)}
                      placeholder="Explain what changes are needed..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white placeholder-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleReject}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-all"
                      >
                        Confirm Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectComments("");
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {challenge.status === "pending_approval" && !isAdmin && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs flex gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Pending review from system SUPER ADMIN. Only admins can approve or reject challenges.</span>
              </div>
            )}

            {challenge.status === "published" && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex gap-2">
                <Award className="w-4 h-4 shrink-0 mt-0.5" />
                <span>This challenge is published and open to startups. No further status changes can be performed in this module.</span>
              </div>
            )}
          </div>

          {/* Eligibility Criteria List & Add Form */}
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800/80 pb-2">
              Eligibility Criteria
            </h3>

            {challenge.criteria.length === 0 ? (
              <p className="text-slate-500 text-xs italic">No criteria specified yet.</p>
            ) : (
              <div className="space-y-3">
                {challenge.criteria.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-xl text-xs space-y-1 relative group">
                    <p className="font-bold text-white">{c.criteria_key}</p>
                    <p className="text-slate-400 font-mono text-[10px]">{JSON.stringify(c.criteria_value_json)}</p>
                    <div className="flex gap-2 text-[10px] text-slate-500 font-semibold pt-1 border-t border-slate-800/30">
                      <span>Waivable: {c.is_waivable ? "Yes" : "No"}</span>
                      {c.is_waivable && <span>Waiver reason req: {c.waiver_reason_required ? "Yes" : "No"}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {challenge.status === "draft" && (
              <form onSubmit={handleAddCriteria} className="border-t border-slate-800/80 pt-4 space-y-3">
                <p className="text-xs font-bold text-slate-300">Add Requirement</p>
                <div>
                  <select
                    value={critKey}
                    onChange={(e) => setCritKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none"
                  >
                    <option value="min_turnover">Minimum Turnover</option>
                    <option value="dpiit_required">DPIIT Registration Required</option>
                    <option value="sector_match">Sector Match Required</option>
                    <option value="min_team_size">Minimum Team Size</option>
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    required
                    value={critVal}
                    onChange={(e) => setCritVal(e.target.value)}
                    placeholder='Value (e.g. {"min": 5} or {"required": true})'
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex gap-4 text-xs select-none">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWaivable}
                      onChange={(e) => setIsWaivable(e.target.checked)}
                      className="rounded border-slate-800 text-indigo-600"
                    />
                    Waivable
                  </label>
                  {isWaivable && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={waiverReq}
                        onChange={(e) => setWaiverReq(e.target.checked)}
                        className="rounded border-slate-800 text-indigo-600"
                      />
                      Waiver reason req
                    </label>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Criteria Row
                </button>
              </form>
            )}
          </div>

          {/* Workflow Timeline */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800/80 pb-2">
              Workflow Timeline
            </h3>

            {challenge.status_history.length === 0 ? (
              <p className="text-slate-500 text-xs italic">No timeline history recorded.</p>
            ) : (
              <div className="relative border-l-2 border-slate-800 pl-4 space-y-6 text-xs ml-2">
                {challenge.status_history.map((h, i) => (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border border-slate-950"></div>
                    <p className="font-bold text-white uppercase tracking-wider text-[10px]">
                      {h.from_status ? h.from_status.toUpperCase() : "DRAFT"} ➔ {h.to_status.toUpperCase()}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(h.changed_at).toLocaleString()}
                    </p>
                    {h.remarks && (
                      <p className="text-slate-400 mt-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 leading-relaxed italic">
                        "{h.remarks}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Matching Startups Section */}
          {(user?.roles?.some((r: any) => ["DEPARTMENT_OFFICER", "SUPER_ADMIN"].includes(r.name))) && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Matching Startups (AI)
                </h3>
              </div>

              {matchingLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>Computing pgvector similarity...</span>
                </div>
              ) : matchingErr ? (
                <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">{matchingErr}</p>
              ) : matchingStartups.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No completed startup profiles found for matching.</p>
              ) : (
                <div className="space-y-3">
                  {matchingStartups.map((st) => (
                    <div key={st.id} className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                          {st.title_or_name}
                        </span>
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {(st.similarity_score * 100).toFixed(1)}% Match
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">
                        {st.description_or_summary}
                      </p>
                      {st.details?.registration_number && (
                        <p className="text-[10px] text-slate-500 font-mono">Reg: {st.details.registration_number}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
