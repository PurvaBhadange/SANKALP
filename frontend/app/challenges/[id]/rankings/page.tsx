"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Award, Trophy, Sparkles, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";

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
  const router = useRouter();
  const challengeId = params?.id as string;

  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRankings() {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        if (!token || !challengeId) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/challenges/${challengeId}/rankings`, {
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
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 pb-16 font-sans bg-halftone">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header */}
        <div className="border-b-4 border-black pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/challenges/${challengeId}/evaluation`}
              className="p-2 rounded-xl bg-white border-2 border-black text-black hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000] transition-all"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3px]" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-black font-black text-xs uppercase tracking-wider mb-1">
                <Trophy className="w-4 h-4 text-black stroke-[3px]" /> Leaderboard & Final Rankings
              </div>
              <h1 className="text-2xl font-black text-black tracking-tight font-display uppercase">Weighted Evaluation Leaderboard</h1>
              <p className="text-black text-xs font-mono font-bold mt-0.5 uppercase">Challenge ID: {challengeId}</p>
            </div>
          </div>

          <span className="status-pill status-published flex items-center gap-1.5 font-mono">
            <Award className="w-3.5 h-3.5 stroke-[3px]" /> Panel Score Weighted Average
          </span>
        </div>

        {errorMsg ? (
          <div className="p-8 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-black mx-auto stroke-[3px]" />
            <h3 className="text-sm font-black text-black uppercase">Rankings Pending Panel Finalization</h3>
            <p className="text-xs font-bold text-black max-w-md mx-auto uppercase">{errorMsg}</p>
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-black font-mono font-bold text-xs uppercase animate-pulse">Calculating weighted candidate rankings...</div>
        ) : (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] overflow-hidden">
            <div className="p-6 border-b-2 border-black bg-[#FFD93D] flex items-center justify-between">
              <h2 className="text-base font-black text-black uppercase font-display flex items-center gap-2">
                <Trophy className="w-5 h-5 text-black stroke-[3px]" /> Ranked Shortlisted Candidates
              </h2>
              <span className="text-xs font-mono font-black text-black uppercase">Total Shortlisted: {rankings.length}</span>
            </div>

            <div className="divide-y-2 divide-black">
              {rankings.map((item) => (
                <div key={item.application_id} className="p-5 flex items-center justify-between hover:bg-[#FFFDF5] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 border-2 border-black font-black text-sm flex items-center justify-center font-mono shadow-[2px_2px_0px_0px_#000] ${
                      item.rank === 1
                        ? "bg-[#FFD93D] text-black"
                        : item.rank === 2
                        ? "bg-[#C4B5FD] text-black"
                        : item.rank === 3
                        ? "bg-[#86EFAC] text-black"
                        : "bg-white text-black"
                    }`}>
                      #{item.rank}
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-black uppercase">{item.startup_name}</h3>
                      <div className="text-[11px] text-black font-mono font-bold mt-0.5">App ID: {item.application_id}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Module 3 AI Match Score for Context */}
                    {item.ai_match_score !== null && (
                      <div className="text-right hidden sm:block">
                        <div className="text-[10px] text-black uppercase font-bold flex items-center justify-end gap-1">
                          <Sparkles className="w-3 h-3 text-black stroke-[3px]" /> AI Context Score
                        </div>
                        <div className="text-xs font-mono font-black text-black bg-[#86EFAC] px-1 border border-black inline-block mt-0.5">{item.ai_match_score.toFixed(1)}%</div>
                      </div>
                    )}

                    {/* Weighted Final Panel Score */}
                    <div className="text-right bg-[#FFFDF5] border-2 border-black px-4 py-2">
                      <div className="text-[10px] text-black font-black uppercase tracking-wider">Weighted Final Score</div>
                      <div className="text-base font-mono font-black text-black">{item.weighted_final_score.toFixed(2)} <span className="text-xs text-black/60">/ 100</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
