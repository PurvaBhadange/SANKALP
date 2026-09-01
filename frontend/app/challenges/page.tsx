"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCookie } from "cookies-next";
import { Plus, Loader2, Building2, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface Challenge {
  id: string;
  title: string;
  raw_problem_text: string;
  status: string;
  budget_ceiling: number | null;
  currency: string;
  timeline_start: string | null;
  timeline_end: string | null;
  created_at: string;
  sector?: { name: string };
}

export default function ChallengesList() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchChallengesAndProfile = async () => {
      const token = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      try {
        // Fetch User profile to determine roles
        const profileRes = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUserRoles(profile.roles.map((r: any) => r.name));
        }

        // Fetch Challenges
        const url = statusFilter === "all" 
          ? `${apiUrl}/challenges` 
          : `${apiUrl}/challenges?status=${statusFilter}`;
          
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          throw new Error("Failed to load challenges.");
        }

        const data = await res.json();
        setChallenges(data);
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchChallengesAndProfile();
  }, [router, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="status-pill status-draft">Draft</span>;
      case "pending_approval":
        return <span className="status-pill status-pending">Pending Approval</span>;
      case "published":
        return <span className="status-pill status-published">Published</span>;
      case "rejected":
        return <span className="status-pill status-rejected">Rejected</span>;
      default:
        return <span className="status-pill status-draft">{status}</span>;
    }
  };

  const formatBudget = (val: number | null, curr: string) => {
    if (val === null) return "Not Specified";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 0
    }).format(val);
  };

  const isOfficerOrAdmin = userRoles.includes("DEPARTMENT_OFFICER") || userRoles.includes("SUPER_ADMIN");

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-black pb-16 font-sans bg-halftone">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-6">
          <div>
            <div className="inline-block border-2 border-black bg-[#FFD93D] text-black px-3 py-1 font-black text-xs uppercase tracking-widest -rotate-1 shadow-[2px_2px_0px_0px_#000] mb-2">
              PUBLIC PROCUREMENT MARKETPLACE
            </div>
            <h1 className="text-3xl font-black text-black tracking-tight font-display uppercase flex items-center gap-2">
              <Building2 className="w-7 h-7 text-black stroke-[3px]" />
              Innovation Challenges Catalog
            </h1>
            <p className="text-xs text-black font-bold mt-1 uppercase">
              Browse, structure, and manage public sector innovation procurement challenges.
            </p>
          </div>

          {isOfficerOrAdmin && (
            <Link
              href="/challenges/new"
              className="gov-btn-primary self-start md:self-auto"
            >
              <Plus className="w-5 h-5 stroke-[3px]" />
              <span>Draft New Challenge</span>
            </Link>
          )}
        </div>

        {/* Status Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 border-4 border-black shadow-[6px_6px_0px_0px_#000]">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {["all", "draft", "pending_approval", "published"].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                  statusFilter === filter
                    ? "bg-[#FF6B6B] text-black shadow-[3px_3px_0px_0px_#000]"
                    : "bg-white text-black hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000]"
                }`}
              >
                {filter.replace("_", " ")}
              </button>
            ))}
          </div>

          <span className="text-xs text-black font-mono font-black uppercase px-3">
            Showing <strong className="text-black bg-[#FFD93D] px-1.5 border border-black">{challenges.length}</strong> challenges
          </span>
        </div>

        {/* Challenge Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-black gap-3 font-mono font-black">
            <Loader2 className="w-10 h-10 animate-spin text-black stroke-[3px]" />
            <p className="text-xs uppercase">Loading challenges catalog...</p>
          </div>
        ) : challenges.length === 0 ? (
          <div className="bg-white p-12 text-center border-4 border-black shadow-[8px_8px_0px_0px_#000] space-y-4">
            <p className="text-sm text-black font-black uppercase">No challenges found matching the selected status filter.</p>
            {isOfficerOrAdmin && (
              <Link href="/challenges/new" className="gov-btn-secondary text-xs inline-flex">
                Create First Challenge
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((c) => (
              <Link
                key={c.id}
                href={`/challenges/${c.id}`}
                className="bg-white border-4 border-black p-6 flex flex-col justify-between space-y-4 shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1.5 hover:shadow-[12px_12px_0px_0px_#000] transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 bg-[#FFD93D] text-black border-2 border-black text-[10px] font-black uppercase font-mono shadow-[2px_2px_0px_0px_#000]">
                      {c.sector?.name || "General Sector"}
                    </span>
                    {getStatusBadge(c.status)}
                  </div>

                  <h2 className="text-lg font-black text-black group-hover:bg-[#FF6B6B] transition-colors line-clamp-2 uppercase leading-snug">
                    {c.title}
                  </h2>

                  <p className="text-xs text-black font-bold line-clamp-3 leading-relaxed">
                    {c.raw_problem_text}
                  </p>
                </div>

                <div className="pt-4 border-t-3 border-black flex items-center justify-between text-xs font-mono font-black">
                  <div>
                    <span className="text-[10px] text-black/70 block uppercase font-bold">Budget Ceiling</span>
                    <span className="font-mono font-black text-black bg-[#86EFAC] px-1 border border-black inline-block">
                      {formatBudget(c.budget_ceiling, c.currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-black font-black uppercase group-hover:translate-x-1 transition-transform">
                    <span>Workbench</span>
                    <ArrowRight className="w-4 h-4 stroke-[3px]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
