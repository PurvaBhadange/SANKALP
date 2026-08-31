"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, FileText, CheckCircle2, ShieldAlert, ArrowRight, Building2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function EvaluatorDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
              <Award className="w-6 h-6 text-[#19322b]" />
              Expert Evaluator Workspace
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Review assigned innovation challenges, evaluate candidates with AI briefings, and submit tamper-evident scores.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="status-pill status-published">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Blind Scoring Protocol Active
            </span>
          </div>
        </div>

        {/* Informational Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 border-l-4 border-l-[#19322b]">
            <div className="flex items-center gap-2 text-[#19322b] font-bold text-sm">
              <FileText className="w-5 h-5" />
              <span>AI Evaluator Briefings</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Gemini provides objective, score-free executive briefings comparing startup proposals directly against government outcome statements.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 border-l-4 border-l-[#bd5332]">
            <div className="flex items-center gap-2 text-[#bd5332] font-bold text-sm">
              <Award className="w-5 h-5" />
              <span>Blind Scoring Protocol</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Individual evaluator scores remain isolated and hidden until the challenge panel chair officially finalizes scoring.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 border-l-4 border-l-amber-600">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Cryptographic Hash Ledger</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Submitted scores are immutable and chained via cryptographic hashes to guarantee content integrity and tamper detection.
            </p>
          </div>
        </div>

        {/* Assigned Panels Action Sheet */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 font-serif">
            <Building2 className="w-5 h-5 text-[#19322b]" />
            Assigned Challenge Panels & Grading
          </h2>

          <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 text-center space-y-4">
            <p className="text-xs text-slate-600 max-w-md mx-auto font-normal">
              Select an assigned challenge from your dashboard or candidate link to open the evaluation grading sheet.
            </p>
            <div>
              <Link
                href="/challenges"
                className="gov-btn-primary text-xs"
              >
                <span>Browse Published Challenges Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
