"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileText, Loader2, Sparkles, Building2, CheckCircle2, Clock, 
  XCircle, Award, ChevronRight, ShieldAlert
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { fetchWithAuth } from "@/lib/api";

export default function StartupApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth("/startups/me/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to load application history.");
      }
    } catch (e: any) {
      setError("Network error loading applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "shortlisted":
        return <span className="status-pill status-active"><CheckCircle2 className="w-3.5 h-3.5" /> Shortlisted</span>;
      case "under_review":
        return <span className="status-pill status-pending"><Clock className="w-3.5 h-3.5" /> Under Review</span>;
      case "rejected":
        return <span className="status-pill status-rejected"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="status-pill status-draft"><FileText className="w-3.5 h-3.5" /> Submitted</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-400" />
              My Submitted Applications
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Track eligibility screening, AI match scores, and evaluation panel decisions.
            </p>
          </div>

          <Link
            href="/startup/matches"
            className="gov-btn-primary self-start md:self-auto text-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Discover AI Matches</span>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs">Fetching submitted applications...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="gov-card rounded-2xl p-12 text-center space-y-4">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Applications Submitted Yet</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
              Explore open innovation challenges from government departments and submit your startup's application.
            </p>
            <div>
              <Link
                href="/challenges"
                className="gov-btn-primary text-xs"
              >
                Browse Open Challenges
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="gov-card p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold uppercase">
                        {app.challenge?.department?.name || "Govt Dept"}
                      </span>
                      {getStatusBadge(app.status)}
                    </div>
                    <h3 className="text-lg font-bold text-white hover:text-indigo-400 transition-colors">
                      <Link href={`/challenges/${app.challenge_id}`}>{app.challenge?.title || "Challenge"}</Link>
                    </h3>
                  </div>

                  {app.ai_match_score !== null && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl self-start md:self-auto">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">AI Match Score</p>
                        <p className="text-sm font-black text-emerald-400 font-mono">{Number(app.ai_match_score).toFixed(1)}%</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Eligibility Screening Results Breakdown */}
                {app.eligibility_results && app.eligibility_results.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eligibility Criteria Status</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {app.eligibility_results.map((res: any) => (
                        <div key={res.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white font-mono text-[11px]">
                              {res.criteria?.criteria_key || "Criteria"}
                            </span>
                            {res.waived ? (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold text-[10px]">Waived</span>
                            ) : res.final_passed === true ? (
                              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[10px]">Passed</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-slate-800 text-amber-400 rounded font-bold text-[10px]">Pending Review</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Rules Engine: {res.rules_engine_passed ? "✓ Pass" : "✗ Fail"} | AI Verification: {res.ai_verification_passed === true ? "✓ Verified" : res.ai_verification_passed === false ? "✗ Failed" : "N/A"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800/50">
                  <span>Submitted at: {new Date(app.submitted_at).toLocaleDateString()}</span>
                  <Link
                    href={`/challenges/${app.challenge_id}`}
                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    <span>View Challenge Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
