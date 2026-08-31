"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, Users, Award, Lock, Unlock, CheckCircle2, ArrowRight } from "lucide-react";

interface Panel {
  id: string;
  challenge_id: string;
  name: string;
  scoring_status: string;
  members: { id: string; full_name: string; email: string }[];
}

export default function ChallengeEvaluationManagement() {
  const params = useParams();
  const challengeId = params?.id as string;

  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPanel() {
      try {
        const token = localStorage.getItem("token");
        if (!token || !challengeId) return;

        const res = await fetch(`http://127.0.0.1:8000/challenges/${challengeId}/panel`, {
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
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`http://127.0.0.1:8000/panels/${panel.id}/finalize`, {
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
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm mb-1">
              <Award className="w-4 h-4" /> Challenge Panel & Score Administration
            </div>
            <h1 className="text-2xl font-extrabold text-white">Evaluation Control Center</h1>
            <p className="text-slate-400 text-xs mt-1">Challenge ID: {challengeId}</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/challenges/${challengeId}/rankings`}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              View Weighted Rankings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {msg && (
          <div className="p-4 bg-slate-900 border border-indigo-500/30 text-indigo-300 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {msg}
          </div>
        )}

        {/* Panel Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Evaluation Panel Members
              </h2>
              {panel?.scoring_status === "finalized" ? (
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-md flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5" /> Finalized
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-md flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Scoring Open (Blind)
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs animate-pulse">Loading panel information...</div>
            ) : panel ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 font-medium">Panel Name: <span className="text-indigo-400">{panel.name}</span></p>
                <div className="space-y-2">
                  {panel.members.map((m) => (
                    <div key={m.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">{m.full_name}</div>
                        <div className="text-[11px] text-slate-400">{m.email}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">EVALUATOR</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">No evaluation panel configured.</div>
            )}
          </div>

          {/* Panel Actions */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Finalization Guard & Integrity
              </h2>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Finalizing the panel validates that all assigned evaluators have completed scoring for every shortlisted application across all criteria. Finalizing unlocks evaluator-level visibility and generates weighted applicant rankings.
            </p>

            {panel && panel.scoring_status !== "finalized" && (
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {finalizing ? "Validating & Finalizing Panel..." : "Finalize Panel & Unlock Rankings"}
              </button>
            )}

            {panel?.scoring_status === "finalized" && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Panel scoring is finalized. Individual scores are unblinded and candidate rankings are active.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
