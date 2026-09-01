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
    <div className="min-h-screen bg-[#FFFDF5] text-black pb-16 font-sans bg-halftone">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-6">
          <div>
            <div className="inline-block border-2 border-black bg-[#FFD93D] text-black px-3 py-1 font-black text-xs uppercase tracking-widest -rotate-1 shadow-[2px_2px_0px_0px_#000] mb-2">
              EXPERT EVALUATOR PANEL
            </div>
            <h1 className="text-3xl font-black text-black tracking-tight font-display uppercase flex items-center gap-2">
              <Award className="w-7 h-7 text-black stroke-[3px]" />
              Expert Evaluator Workspace
            </h1>
            <p className="text-xs text-black font-bold mt-1 uppercase">
              Review assigned innovation challenges, evaluate candidates with AI briefings, and submit tamper-evident scores.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="status-pill status-published">
              <CheckCircle2 className="w-4 h-4 stroke-[3px]" />
              Blind Scoring Active
            </span>
          </div>
        </div>

        {/* Informational Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FFD93D] p-6 border-4 border-black shadow-[8px_8px_0px_0px_#000] space-y-3">
            <div className="flex items-center gap-2 text-black font-black text-base uppercase">
              <FileText className="w-5 h-5 stroke-[3px]" />
              <span>AI Evaluator Briefings</span>
            </div>
            <p className="text-xs text-black font-bold leading-relaxed">
              Gemini provides objective, score-free executive briefings comparing startup proposals directly against government outcome statements.
            </p>
          </div>

          <div className="bg-[#C4B5FD] p-6 border-4 border-black shadow-[8px_8px_0px_0px_#000] space-y-3">
            <div className="flex items-center gap-2 text-black font-black text-base uppercase">
              <Award className="w-5 h-5 stroke-[3px]" />
              <span>Blind Scoring Protocol</span>
            </div>
            <p className="text-xs text-black font-bold leading-relaxed">
              Individual evaluator scores remain isolated and hidden until the challenge panel chair officially finalizes scoring.
            </p>
          </div>

          <div className="bg-[#86EFAC] p-6 border-4 border-black shadow-[8px_8px_0px_0px_#000] space-y-3">
            <div className="flex items-center gap-2 text-black font-black text-base uppercase">
              <ShieldAlert className="w-5 h-5 stroke-[3px]" />
              <span>Cryptographic Ledger</span>
            </div>
            <p className="text-xs text-black font-bold leading-relaxed">
              Submitted scores are immutable and chained via cryptographic hashes to guarantee content integrity and tamper detection.
            </p>
          </div>
        </div>

        {/* Assigned Panels Action Sheet */}
        <div className="bg-white p-8 border-4 border-black shadow-[12px_12px_0px_0px_#000] space-y-6">
          <h2 className="text-xl font-black text-black flex items-center gap-2 font-display uppercase">
            <Building2 className="w-6 h-6 text-black stroke-[3px]" />
            Assigned Challenge Panels & Grading
          </h2>

          <div className="bg-[#FFFDF5] p-8 border-3 border-dashed border-black text-center space-y-4">
            <p className="text-xs text-black font-black uppercase max-w-md mx-auto">
              Select an assigned challenge from your dashboard or candidate link to open the evaluation grading sheet.
            </p>
            <div>
              <Link
                href="/challenges"
                className="gov-btn-primary text-xs"
              >
                <span>Browse Published Challenges Catalog</span>
                <ArrowRight className="w-4 h-4 stroke-[3px]" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
