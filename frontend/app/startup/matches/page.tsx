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
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs text-slate-400 font-medium">Computing pgvector semantic distance matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <Link href="/startup/profile" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-400" />
                AI Semantic Match Finder
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Challenges ranked by vector similarity (768D pgvector) against your startup capability vector.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="ai-badge">HNSW Vector Search Active</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {matches.length === 0 ? (
          <div className="gov-card rounded-2xl p-12 text-center border border-slate-800 space-y-3">
            <Award className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No Published Matches Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no published challenges matching your startup's capability vector. Check back soon as new challenges are published!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, idx) => (
              <div
                key={match.id}
                className="ai-card p-6 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-mono font-bold">
                        #{idx + 1}
                      </span>
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {match.title_or_name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded text-[10px] font-bold uppercase font-mono">
                        {match.sector_name || "General"}
                      </span>
                      {getScoreBadge(match.similarity_score)}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {match.description_or_summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-indigo-500/20 flex items-center justify-between text-xs">
                  {match.details?.budget_ceiling ? (
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Budget Ceiling</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {match.details.currency} {new Intl.NumberFormat().format(match.details.budget_ceiling)}
                      </span>
                    </div>
                  ) : <div></div>}

                  <Link
                    href={`/challenges/${match.id}`}
                    className="gov-btn-primary text-xs"
                  >
                    <span>View Challenge & Apply</span>
                    <ArrowRight className="w-4 h-4" />
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
