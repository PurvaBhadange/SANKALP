"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, Award, Calendar, ExternalLink, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { fetchWithAuth } from "@/lib/api";

interface SemanticMatch {
  id: string;
  title_or_name: string;
  similarity_score: number;
  sector_name: string | null;
  description_or_summary: string | null;
  item_type: string;
  details?: {
    budget_ceiling: number | null;
    currency: string;
    status: string;
  };
}

export default function StartupMatches() {
  const [matches, setMatches] = useState<SemanticMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetchWithAuth("/startups/me/matching-challenges?top_k=5");
        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Could not retrieve matching challenges.");
        }

        const data = await res.json();
        setMatches(data);
      } catch (err: any) {
        setError(err.message || "Failed to load matches.");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [router]);

  const getScoreBadge = (score: number) => {
    const pct = (score * 100).toFixed(1);
    if (score >= 0.8) return <span className="status-pill status-active"><Sparkles className="w-3.5 h-3.5" /> {pct}% Match</span>;
    if (score >= 0.6) return <span className="status-pill status-pending"><Sparkles className="w-3.5 h-3.5" /> {pct}% Match</span>;
    return <span className="status-pill status-draft"><Sparkles className="w-3.5 h-3.5" /> {pct}% Match</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] text-slate-900 pb-16 font-sans bg-halftone">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-24 gap-3 font-mono font-black">
          <Loader2 className="w-10 h-10 animate-spin text-black stroke-[3px]" />
          <p className="text-xs uppercase">Computing pgvector semantic distance matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 pb-16 font-sans bg-halftone">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-6">
          <div className="flex items-center gap-3">
            <Link href="/startup/profile" className="p-2 rounded-xl bg-white border-2 border-black text-black hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000] transition-all">
              <ArrowLeft className="w-4 h-4 stroke-[3px]" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight font-display uppercase flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-black stroke-[3px]" />
                AI Semantic Match Finder
              </h1>
              <p className="text-xs text-black font-bold mt-0.5 uppercase">
                Challenges ranked by vector similarity (768D pgvector) against your startup capability vector.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="status-pill status-published font-mono">HNSW Vector Search Active</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FF6B6B] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000]">
            {error}
          </div>
        )}

        {matches.length === 0 ? (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-12 text-center space-y-3">
            <Award className="w-12 h-12 text-black mx-auto stroke-[3px]" />
            <h3 className="text-base font-black text-black uppercase font-display">No Published Matches Found</h3>
            <p className="text-xs text-black font-bold max-w-sm mx-auto uppercase">
              There are currently no published challenges matching your startup's capability vector. Check back soon as new challenges are published!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, idx) => (
              <div
                key={match.id}
                className="bg-white border-4 border-black p-6 flex flex-col justify-between space-y-4 shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000] transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 border-2 border-black bg-[#FFD93D] text-black flex items-center justify-center text-xs font-mono font-black shadow-[2px_2px_0px_0px_#000]">
                        #{idx + 1}
                      </span>
                      <h3 className="text-lg font-black text-black uppercase group-hover:bg-[#FFD93D] transition-colors inline-block">
                        {match.title_or_name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#FFFDF5] text-black border border-black text-[10px] font-black uppercase font-mono">
                        {match.sector_name || "General"}
                      </span>
                      {getScoreBadge(match.similarity_score)}
                    </div>
                  </div>

                  <p className="text-xs text-black font-bold leading-relaxed line-clamp-3">
                    {match.description_or_summary}
                  </p>
                </div>

                <div className="pt-3 border-t-2 border-black flex items-center justify-between text-xs font-mono">
                  {match.details?.budget_ceiling ? (
                    <div>
                      <span className="text-[10px] text-black uppercase font-bold block">Budget Ceiling</span>
                      <span className="font-mono font-black text-black bg-[#86EFAC] px-1 border border-black inline-block mt-0.5">
                        {match.details.currency} {new Intl.NumberFormat().format(match.details.budget_ceiling)}
                      </span>
                    </div>
                  ) : <div></div>}

                  <Link
                    href={`/challenges/${match.id}`}
                    className="gov-btn-primary text-xs flex items-center gap-1.5"
                  >
                    <span>View Challenge & Apply</span>
                    <ArrowRight className="w-4 h-4 stroke-[3px]" />
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
