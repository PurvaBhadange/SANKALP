"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Award, FileText, CheckCircle2, ShieldCheck, Sparkles, AlertCircle, ArrowLeft, Lock } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { fetchWithAuth } from "@/lib/api";

interface EvaluationCriteria {
  id: string;
  name: string;
  weight: number;
  max_score: number;
}

interface ScoreInput {
  criteria_id: string;
  score: number;
  comments: string;
}

export default function EvaluatorScoringPage() {
  const params = useParams();
  const applicationId = params?.id as string;

  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState<boolean>(true);
  const [criteriaList, setCriteriaList] = useState<EvaluationCriteria[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreInput>>({});
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!applicationId) return;
      try {
        // Fetch briefing
        const bRes = await fetchWithAuth(`/applications/${applicationId}/briefing`);
        if (bRes.ok) {
          const bData = await bRes.json();
          setBriefing(bData.briefing_text);
        }

        // Fetch existing scores to check if already submitted
        const sRes = await fetchWithAuth(`/applications/${applicationId}/scores`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.length > 0) {
            setSubmitted(true);
          }
        }
      } catch (err) {
        console.error("Error fetching briefing or scores:", err);
      } finally {
        setBriefingLoading(false);
      }
    }
    fetchData();
  }, [applicationId]);

  const handleScoreChange = (criteriaId: string, val: number) => {
    setScores((prev) => ({
      ...prev,
      [criteriaId]: {
        criteria_id: criteriaId,
        score: val,
        comments: prev[criteriaId]?.comments || ""
      }
    }));
  };

  const handleCommentChange = (criteriaId: string, text: string) => {
    setScores((prev) => ({
      ...prev,
      [criteriaId]: {
        criteria_id: criteriaId,
        score: prev[criteriaId]?.score || 0,
        comments: text
      }
    }));
  };

  const handleSubmitScores = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payload = {
        scores: Object.values(scores)
      };

      const res = await fetchWithAuth(`/applications/${applicationId}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || "Failed to submit scores.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/evaluator/dashboard" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" /> Candidate Evaluation & AI Briefing
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Application ID: {applicationId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="status-pill status-published">
              <ShieldCheck className="w-3.5 h-3.5" /> SHA-256 Ledger Protected
            </span>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Evaluator Briefing Panel */}
          <div className="ai-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Neutral AI Evaluator Briefing
              </h2>
              <span className="ai-badge">Gemini Executive Briefing</span>
            </div>

            {briefingLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
                Generating objective evaluator briefing...
              </div>
            ) : (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 text-slate-300 text-xs leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto font-sans">
                {briefing || "AI briefing unavailable. Please evaluate using application documents."}
              </div>
            )}
          </div>

          {/* Scoring Form */}
          <div className="gov-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" /> Criteria Scoring Matrix
              </h2>
              {submitted && (
                <span className="status-pill status-active">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sealed & Hash Chained
                </span>
              )}
            </div>

            {errorMsg && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
              </div>
            )}

            {submitted ? (
              <div className="py-12 text-center bg-slate-950/50 border border-slate-800 rounded-xl space-y-3 p-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">Confidential Scores Submitted</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Your score entry has been written to the cryptographic tamper-evident ledger. Scores remain blind to other panel members until the challenge panel is officially finalized by the officer.
                </p>
                <div className="pt-2">
                  <Link href="/evaluator/dashboard" className="gov-btn-secondary text-xs">
                    Return to Evaluator Workspace
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter criteria scores. Once submitted, score rows are cryptographically hashed and cannot be silently edited.
                </p>

                <button
                  onClick={handleSubmitScores}
                  disabled={submitting}
                  className="w-full gov-btn-primary py-3"
                >
                  {submitting ? "Submitting to Cryptographic Hash Ledger..." : "Submit Confidential Scores"}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
