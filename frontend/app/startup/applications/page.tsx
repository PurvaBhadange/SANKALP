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
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 pb-16 font-sans bg-halftone">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-6">
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight font-display uppercase flex items-center gap-2">
              <FileText className="w-6 h-6 text-black stroke-[3px]" />
              My Submitted Applications
            </h1>
            <p className="text-xs text-black font-bold mt-1 uppercase">
              Track eligibility screening, AI match scores, and evaluation panel decisions.
            </p>
          </div>

          <Link
            href="/startup/matches"
            className="gov-btn-primary self-start md:self-auto text-xs flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 stroke-[3px]" />
            <span>Discover AI Matches</span>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-black gap-3 font-mono font-black">
            <Loader2 className="w-10 h-10 animate-spin text-black stroke-[3px]" />
            <p className="text-xs uppercase">Fetching submitted applications...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-[#FF6B6B] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-black shrink-0 stroke-[3px]" />
            <span>{error}</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-12 text-center space-y-4">
            <Building2 className="w-12 h-12 text-black mx-auto stroke-[3px]" />
            <h3 className="text-base font-black text-black uppercase font-display">No Applications Submitted Yet</h3>
            <p className="text-black text-xs font-bold max-w-md mx-auto leading-relaxed uppercase">
              Explore open innovation challenges from government departments and submit your startup's application.
            </p>
            <div>
              <Link
                href="/challenges"
                className="gov-btn-primary text-xs inline-flex"
              >
                Browse Open Challenges
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="bg-white border-4 border-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#000]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-[#FFD93D] text-black border border-black text-[10px] font-mono font-black uppercase">
                        {app.challenge?.department?.name || "Govt Dept"}
                      </span>
                      {getStatusBadge(app.status)}
                    </div>
                    <h3 className="text-lg font-black text-black uppercase hover:bg-[#FFD93D] transition-colors inline-block">
                      <Link href={`/challenges/${app.challenge_id}`}>{app.challenge?.title || "Challenge"}</Link>
                    </h3>
                  </div>

                  {app.ai_match_score !== null && (
                    <div className="flex items-center gap-2 bg-[#86EFAC] border-2 border-black px-3.5 py-1.5 shadow-[2px_2px_0px_0px_#000] self-start md:self-auto">
                      <Sparkles className="w-4 h-4 text-black stroke-[3px]" />
                      <div>
                        <p className="text-[10px] text-black font-black uppercase tracking-wider">AI Match Score</p>
                        <p className="text-sm font-black text-black font-mono">{Number(app.ai_match_score).toFixed(1)}%</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Eligibility Screening Results Breakdown */}
                {app.eligibility_results && app.eligibility_results.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-black uppercase tracking-wider">Eligibility Criteria Status</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {app.eligibility_results.map((res: any) => (
                        <div key={res.id} className="p-3 bg-[#FFFDF5] border-2 border-black space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-black text-black font-mono text-[11px] uppercase">
                              {res.criteria?.criteria_key || "Criteria"}
                            </span>
                            {res.waived ? (
                              <span className="px-1.5 py-0.5 bg-[#FFD93D] text-black border border-black font-black text-[10px] uppercase">Waived</span>
                            ) : res.final_passed === true ? (
                              <span className="px-1.5 py-0.5 bg-[#86EFAC] text-black border border-black font-black text-[10px] uppercase">Passed</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-[#FF6B6B] text-black border border-black font-black text-[10px] uppercase">Pending Review</span>
                            )}
                          </div>
                          <p className="text-[10px] text-black font-bold font-mono">
                            Rules: {res.rules_engine_passed ? "✓ Pass" : "✗ Fail"} | AI Doc: {res.ai_verification_passed === true ? "✓ Verified" : res.ai_verification_passed === false ? "✗ Failed" : "N/A"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-black font-bold font-mono pt-2 border-t-2 border-black">
                  <span>Submitted: {new Date(app.submitted_at).toLocaleDateString()}</span>
                  <Link
                    href={`/challenges/${app.challenge_id}`}
                    className="inline-flex items-center gap-1 text-black hover:bg-[#FFD93D] px-1 border border-black font-black uppercase"
                  >
                    <span>View Challenge Details</span>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[3px]" />
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
