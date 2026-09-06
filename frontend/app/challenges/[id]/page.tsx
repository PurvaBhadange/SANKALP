"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getCookie } from "cookies-next";
import { 
  ArrowLeft, BrainCircuit, Loader2, Save, Send, CheckCircle, 
  XCircle, Plus, Calendar, Badge, ShieldAlert, Award, Sparkles, Building2
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

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
    const token = getCookie("access_token") || localStorage.getItem("access_token");
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
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
        <Navbar />
        <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-9 h-9 animate-spin text-red-600" />
            <p className="text-sm text-slate-600 font-medium">Retrieving challenge workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
        <Navbar />
        <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-rose-700 mb-2">Load Error</h2>
            <p className="text-slate-600 text-sm mb-6">{error}</p>
            <Link href="/challenges" className="gov-btn-primary px-6 py-2.5 inline-block text-sm">
              Back to Challenges
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) return null;

  const isCreator = user && challenge.created_by === user.id;
  const isAdmin = user && user.roles.some((r: any) => r.name === "SUPER_ADMIN");

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20">
      <Navbar />

      {/* Main Layout */}
      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10 space-y-6">
        
        {/* Top Header Navigation & Status Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm border-t-4 border-[#1b3b30] relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/challenges" className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <span className="text-xs font-bold text-[#1b3b30] uppercase tracking-wider block font-mono">
                  Challenge Workspace
                </span>
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 tracking-tight">
                  {challenge.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {challenge.status === "pending_approval" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-xs font-mono">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  Pending Approval
                </span>
              )}
              {challenge.status === "published" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-xs font-mono">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                  Published
                </span>
              )}
              {challenge.status === "draft" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300 font-mono">
                  <Badge className="w-3.5 h-3.5 text-slate-600" />
                  Draft
                </span>
              )}
              {challenge.status === "rejected" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-rose-100 text-rose-950 border border-rose-300 font-mono">
                  <XCircle className="w-3.5 h-3.5 text-rose-700" />
                  Rejected
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side: Challenge Info & Status Workflow */}
          <div className="lg:col-span-2 space-y-8">
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm font-semibold flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-700 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Problem Statement Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm border-l-4 border-l-[#c85a32]">
              <div className="flex flex-wrap gap-2.5 text-xs font-bold">
                <span className="bg-rose-50 text-[#c85a32] px-3.5 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#c85a32]"></span>
                  Sector: {challenge.sector?.name || "Other"}
                </span>
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 shadow-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                  Timeline: {challenge.timeline_start ? challenge.timeline_start : "N/A"} to {challenge.timeline_end ? challenge.timeline_end : "N/A"}
                </span>
                <span className="bg-emerald-50 text-[#1b3b30] px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-xs font-mono font-extrabold">
                  Budget Limit: {challenge.budget_ceiling ? `${challenge.currency} ${new Intl.NumberFormat().format(challenge.budget_ceiling)}` : "Not set"}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h2 className="text-xs font-bold text-[#c85a32] uppercase tracking-widest mb-3 flex items-center gap-2 font-mono">
                  <Building2 className="w-4 h-4 text-[#c85a32]" />
                  Raw Problem Statement
                </h2>
                <div className="bg-slate-50/90 p-5 rounded-xl border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                  {challenge.raw_problem_text}
                </div>
              </div>
            </div>

            {/* AI Structuring section */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm border-l-4 border-l-[#1b3b30]">
              <div className="bg-[#1b3b30] text-white p-5 sm:p-6 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
                    <Sparkles className="w-6 h-6 text-[#FFD93D]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 font-serif text-white">
                      AI Structuring Workspace
                    </h3>
                    <p className="text-xs text-emerald-100/80 mt-0.5 font-medium">
                      Structure measurable outcomes, scope, suggested KPIs and constraints using AI.
                    </p>
                  </div>
                </div>
                {challenge.status === "draft" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleAiStructure}
                    className="bg-[#FFD93D] hover:bg-[#ffcc00] text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all border border-slate-900 cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <BrainCircuit className="w-4 h-4 text-slate-950" />}
                    <span>Run AI Structuring</span>
                  </button>
                )}
              </div>

              <div className="p-6 sm:p-8 space-y-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                    Structured Outcomes Data (JSON Specification)
                  </label>
                  <span className="text-[11px] font-mono text-[#1b3b30] font-bold">JSON Outcome Model</span>
                </div>

                <textarea
                  rows={12}
                  value={editableJson}
                  disabled={challenge.status !== "draft"}
                  onChange={(e) => setEditableJson(e.target.value)}
                  placeholder='Click "Run AI Structuring" or paste custom structured outcomes JSON here...'
                  className="w-full bg-[#0f172a] text-emerald-400 border border-slate-800 rounded-xl py-3.5 px-4 placeholder-slate-500 font-mono text-xs focus:ring-2 focus:ring-[#1b3b30] focus:outline-none transition-all leading-relaxed shadow-inner"
                />
                
                {challenge.status === "draft" && (
                  <div className="flex items-center gap-3 mt-3 justify-end">
                    {editSuccess && (
                      <span className="text-xs text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Edits Saved Successfully.
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveManualEdit}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                      <Save className="w-4 h-4 text-[#FFD93D]" />
                      Save Structured Outcomes
                    </button>
                  </div>
                )}

                {challenge.ai_structuring_metadata && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-[11px] text-slate-700 font-mono space-y-1">
                    <p><span className="font-bold text-slate-900">AI Engine:</span> {challenge.ai_structuring_metadata.model_name}</p>
                    <p><span className="font-bold text-slate-900">Generated At:</span> {new Date(challenge.ai_structuring_metadata.timestamp).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Criteria Setup & Status Logs */}
          <div className="space-y-8">
            
            {/* Action Center (Approval state transitions) */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm border-l-4 border-l-[#1b3b30]">
              <div className="bg-[#0f172a] text-white px-5 py-3.5 font-bold uppercase tracking-wider text-xs flex items-center justify-between font-mono">
                <span>Action Center</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              
              <div className="p-6 space-y-4">
                {challenge.status === "draft" && (isCreator || isAdmin) && (
                  <button
                    type="button"
                    onClick={handleSubmitApproval}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1b3b30] hover:bg-[#132b23] text-white font-extrabold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-[#FFD93D]" />}
                    Submit for Department Approval
                  </button>
                )}

                {challenge.status === "published" && user?.roles?.some((r: any) => r.name === "STARTUP_USER") && (
                  <div className="space-y-3">
                    {hasApplied ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                        <p className="text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600" /> Application Submitted
                        </p>
                        <Link
                          href="/startup/applications"
                          className="text-xs text-[#1b3b30] hover:underline font-bold block"
                        >
                          View in My Applications ➔
                        </Link>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyChallenge}
                        disabled={applyLoading}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1b3b30] hover:bg-[#132b23] text-white text-sm font-extrabold rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        {applyLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
                        <span>Apply for Challenge</span>
                      </button>
                    )}
                  </div>
                )}

                {challenge.status === "published" && user?.roles?.some((r: any) => ["DEPARTMENT_OFFICER", "SUPER_ADMIN"].includes(r.name)) && (
                  <Link
                    href={`/challenges/${id}/applications`}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1b3b30] hover:bg-[#132b23] text-white text-sm font-extrabold rounded-xl transition-all shadow-sm"
                  >
                    <Award className="w-4 h-4 text-[#FFD93D]" />
                    <span>Review Applicants & Screening</span>
                  </Link>
                )}

                {challenge.status === "pending_approval" && isAdmin && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1b3b30] hover:bg-[#132b23] text-white text-sm font-extrabold rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve and Publish
                    </button>
                    
                    {!showRejectForm ? (
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 hover:bg-rose-100 text-rose-800 text-sm font-bold rounded-xl transition-all border border-rose-300 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 text-rose-700" />
                        Reject to Draft
                      </button>
                    ) : (
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                          Reason for Rejection
                        </label>
                        <textarea
                          rows={3}
                          value={rejectComments}
                          onChange={(e) => setRejectComments(e.target.value)}
                          placeholder="Explain what changes are needed..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleReject}
                            className="flex-1 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg transition-all"
                          >
                            Confirm Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowRejectForm(false);
                              setRejectComments("");
                            }}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {challenge.status === "pending_approval" && !isAdmin && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs flex gap-2.5">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
                    <span className="font-semibold leading-relaxed">Pending review from system SUPER ADMIN. Only admins can approve or reject challenges.</span>
                  </div>
                )}

                {challenge.status === "published" && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs flex gap-2.5">
                    <Award className="w-5 h-5 shrink-0 text-emerald-700 mt-0.5" />
                    <span className="font-semibold leading-relaxed">This challenge is published and open to startups. No further status changes can be performed in this module.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Eligibility Criteria List & Add Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm border-l-4 border-l-[#1b3b30]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-[#1b3b30] uppercase tracking-widest font-mono flex items-center gap-2">
                  <Badge className="w-4 h-4 text-[#1b3b30]" />
                  Eligibility Criteria ({challenge.criteria.length})
                </h3>
              </div>

              {challenge.criteria.length === 0 ? (
                <p className="text-slate-500 text-xs italic bg-slate-50 p-3 rounded-xl border border-slate-200/80">No criteria specified yet.</p>
              ) : (
                <div className="space-y-3">
                  {challenge.criteria.map((c) => (
                    <div key={c.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 relative">
                      <div className="flex items-center justify-between">
                        <p className="font-bold uppercase font-mono text-[11px] text-[#1b3b30]">{c.criteria_key}</p>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-[#1b3b30] text-[10px] font-mono font-bold">Requirement</span>
                      </div>
                      <p className="text-slate-700 font-mono text-[11px] bg-white p-2 rounded border border-slate-200">{JSON.stringify(c.criteria_value_json)}</p>
                      <div className="flex gap-3 text-[11px] text-slate-600 font-semibold pt-1">
                        <span className={c.is_waivable ? "text-emerald-800 font-bold" : "text-slate-500"}>
                          Waivable: {c.is_waivable ? "Yes" : "No"}
                        </span>
                        {c.is_waivable && <span>Waiver reason req: {c.waiver_reason_required ? "Yes" : "No"}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {challenge.status === "draft" && (
                <form onSubmit={handleAddCriteria} className="border-t border-slate-100 pt-4 space-y-3">
                  <p className="text-xs font-bold text-slate-900 uppercase font-mono">Add Requirement</p>
                  <div>
                    <select
                      value={critKey}
                      onChange={(e) => setCritKey(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-[#1b3b30]"
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
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-[#1b3b30]"
                    />
                  </div>
                  <div className="flex gap-4 text-xs select-none">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={isWaivable}
                        onChange={(e) => setIsWaivable(e.target.checked)}
                        className="rounded border-slate-300 text-[#1b3b30] focus:ring-[#1b3b30]"
                      />
                      Waivable
                    </label>
                    {isWaivable && (
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={waiverReq}
                          onChange={(e) => setWaiverReq(e.target.checked)}
                          className="rounded border-slate-300 text-[#1b3b30] focus:ring-[#1b3b30]"
                        />
                        Waiver reason req
                      </label>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#FFD93D]" />
                    Add Criteria Row
                  </button>
                </form>
              )}
            </div>

            {/* Workflow Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm border-l-4 border-l-[#c85a32]">
              <h3 className="text-xs font-bold text-[#c85a32] uppercase tracking-widest font-mono border-b border-slate-100 pb-2">
                Workflow Timeline
              </h3>

              {challenge.status_history.length === 0 ? (
                <p className="text-slate-500 text-xs italic bg-slate-50 p-3 rounded-xl border border-slate-200/80">No timeline history recorded.</p>
              ) : (
                <div className="relative border-l-2 border-slate-300 pl-4 space-y-5 text-xs ml-2">
                  {challenge.status_history.map((h) => (
                    <div key={h.id} className="relative">
                      <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                        h.to_status === 'published' ? 'bg-[#1b3b30]' :
                        h.to_status === 'pending_approval' ? 'bg-[#FFD93D]' :
                        h.to_status === 'rejected' ? 'bg-[#c85a32]' :
                        'bg-slate-900'
                      }`}></div>
                      <p className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] font-mono">
                        {h.from_status ? h.from_status.toUpperCase() : "DRAFT"} ➔ <span className="text-[#1b3b30]">{h.to_status.toUpperCase()}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {new Date(h.changed_at).toLocaleString()}
                      </p>
                      {h.remarks && (
                        <p className="text-slate-800 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs italic font-medium">
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
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm border-l-4 border-l-[#1b3b30]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-[#1b3b30] uppercase tracking-widest font-mono flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#c85a32]" />
                    Matching Startups (AI)
                  </h3>
                </div>

                {matchingLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-600 py-4 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-[#1b3b30]" />
                    <span>Computing pgvector similarity...</span>
                  </div>
                ) : matchingErr ? (
                  <p className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium">{matchingErr}</p>
                ) : matchingStartups.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-200/80">No completed startup profiles found for matching.</p>
                ) : (
                  <div className="space-y-3">
                    {matchingStartups.map((st) => (
                      <div key={st.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs hover:bg-emerald-50/50 transition-colors">
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#1b3b30]" />
                            {st.title_or_name}
                          </span>
                          <span className="inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-[#1b3b30] border border-emerald-300">
                            {(st.similarity_score * 100).toFixed(1)}% Match
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11px] line-clamp-2 leading-relaxed">
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
        </div>
      </main>
    </div>
  );
}
