"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Award, Trophy, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

interface RankingItem {
  rank: number;
  application_id: string;
  startup_name: string;
  weighted_final_score: number;
  ai_match_score: number | null;
  status: string;
}

export default function ChallengeRankingsPage() {
  const params = useParams();
  const challengeId = params?.id as string;

  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRankings() {
      try {
        const token = localStorage.getItem("token");
        if (!token || !challengeId) return;

        const res = await fetch(`http://127.0.0.1:8000/challenges/${challengeId}/rankings`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setRankings(data);
        } else {
          const err = await res.json();
          setErrorMsg(err.detail || "Rankings unavailable.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load rankings.");
      } finally {
        setLoading(false);
      }
    }
    fetchRankings();
  }, [challengeId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm mb-1">
              <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard & Final Rankings
            </div>
            <h1 className="text-2xl font-extrabold text-white">Weighted Evaluation Leaderboard</h1>
            <p className="text-slate-400 text-xs mt-1">Challenge ID: {challengeId}</p>
          </div>

          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-full flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> Panel Score Weighted Average
          </span>
        </div>

        {errorMsg ? (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Rankings Pending Panel Finalization</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{errorMsg}</p>
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-slate-400 text-xs animate-pulse">Calculating weighted candidate rankings...</div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Ranked Shortlisted Candidates
              </h2>
              <span className="text-xs text-slate-400">Total Shortlisted: {rankings.length}</span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {rankings.map((item) => (
                <div key={item.application_id} className="p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl font-extrabold text-sm flex items-center justify-center ${
                      item.rank === 1
                        ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                        : item.rank === 2
                        ? "bg-slate-300 text-slate-950"
                        : item.rank === 3
                        ? "bg-amber-700/80 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}>
                      #{item.rank}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">{item.startup_name}</h3>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">App ID: {item.application_id}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    {/* Module 3 AI Match Score for Context */}
                    {item.ai_match_score !== null && (
                      <div className="text-right hidden sm:block">
                        <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-400" /> AI Context Score
                        </div>
                        <div className="text-xs font-semibold text-slate-300">{item.ai_match_score.toFixed(1)}%</div>
                      </div>
                    )}

                    {/* Weighted Final Panel Score */}
                    <div className="text-right bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl">
                      <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Weighted Final Score</div>
                      <div className="text-base font-extrabold text-amber-400">{item.weighted_final_score.toFixed(2)} <span className="text-xs text-slate-500">/ 100</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
