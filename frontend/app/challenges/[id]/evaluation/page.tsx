"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, Users, Award, Lock, Unlock, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface Panel {
  id: string;
  challenge_id: string;
  name: string;
  scoring_status: string;
  members: { id: string; full_name: string; email: string }[];
}

export default function ChallengeEvaluationManagement() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params?.id as string;

  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPanel() {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        if (!token || !challengeId) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/challenges/${challengeId}/panel`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPanel(data);
        }
      } catch (err) {
        console.error("Error fetching panel:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPanel();
  }, [challengeId]);

  const handleFinalize = async () => {
    if (!panel) return;
    try {
      setFinalizing(true);
      setMsg(null);
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/panels/${panel.id}/finalize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const updated = await res.json();
        setPanel(updated);
        setMsg("Panel finalized successfully! Candidate rankings are now unlocked.");
      } else {
        const err = await res.json();
        setMsg(`Error: ${err.detail}`);
      }
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 pb-16 font-sans bg-halftone">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header */}
        <div className="border-b-4 border-black pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/challenges/${challengeId}`}
              className="p-2 rounded-xl bg-white border-2 border-black text-black hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000] transition-all"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3px]" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-black font-black text-xs uppercase tracking-wider mb-1">
                <Award className="w-4 h-4 text-black stroke-[3px]" /> Challenge Panel & Score Administration
              </div>
              <h1 className="text-2xl font-black text-black tracking-tight font-display uppercase">Evaluation Control Center</h1>
              <p className="text-black text-xs font-mono font-bold mt-0.5 uppercase">Challenge ID: {challengeId}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/challenges/${challengeId}/rankings`}
              className="gov-btn-primary text-xs flex items-center gap-2"
            >
              <span>View Weighted Rankings</span>
              <ArrowRight className="w-4 h-4 stroke-[3px]" />
            </Link>
          </div>
        </div>

        {msg && (
          <div className="p-4 bg-[#FFD93D] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 stroke-[3px]" /> {msg}
          </div>
        )}

        {/* Panel Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white border-4 border-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#000]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h2 className="text-base font-black text-black uppercase font-display flex items-center gap-2">
                <Users className="w-4 h-4 text-black stroke-[3px]" /> Evaluation Panel Members
              </h2>
              {panel?.scoring_status === "finalized" ? (
                <span className="status-pill status-published flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5" /> Finalized
                </span>
              ) : (
                <span className="status-pill status-pending flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Scoring Open (Blind)
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-black font-mono font-bold text-xs uppercase animate-pulse">Loading panel information...</div>
            ) : panel ? (
              <div className="space-y-3 font-mono">
                <p className="text-xs text-black font-bold uppercase">Panel Name: <span className="bg-[#FFD93D] px-1 border border-black">{panel.name}</span></p>
                <div className="space-y-2">
                  {panel.members.map((m) => (
                    <div key={m.id} className="p-3 bg-[#FFFDF5] border-2 border-black flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-black uppercase">{m.full_name}</div>
                        <div className="text-[11px] text-black font-bold">{m.email}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-[#C4B5FD] text-black border border-black font-black uppercase">EVALUATOR</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-black font-bold text-xs uppercase">No evaluation panel configured.</div>
            )}
          </div>

          {/* Panel Actions */}
          <div className="bg-white border-4 border-black p-6 space-y-6 shadow-[8px_8px_0px_0px_#000]">
            <div className="border-b-2 border-black pb-3">
              <h2 className="text-base font-black text-black uppercase font-display flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-black stroke-[3px]" /> Finalization Guard & Integrity
              </h2>
            </div>

            <p className="text-xs text-black font-bold leading-relaxed uppercase">
              Finalizing the panel validates that all assigned evaluators have completed scoring for every shortlisted application across all criteria. Finalizing unlocks evaluator-level visibility and generates weighted applicant rankings.
            </p>

            {panel && panel.scoring_status !== "finalized" && (
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="w-full gov-btn-primary text-xs"
              >
                {finalizing ? "Validating & Finalizing Panel..." : "Finalize Panel & Unlock Rankings"}
              </button>
            )}

            {panel?.scoring_status === "finalized" && (
              <div className="p-4 bg-[#86EFAC] border-2 border-black text-black text-xs font-black uppercase flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-black shrink-0 stroke-[3px]" />
                <span>Panel scoring is finalized. Individual scores are unblinded and candidate rankings are active.</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
