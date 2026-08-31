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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#19322b]" />
              Innovation Challenges Catalog
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Browse, structure, and manage public sector innovation procurement challenges.
            </p>
          </div>

          {isOfficerOrAdmin && (
            <Link
              href="/challenges/new"
              className="gov-btn-primary self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Draft New Challenge</span>
            </Link>
          )}
        </div>

        {/* Status Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {["all", "draft", "pending_approval", "published"].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  statusFilter === filter
                    ? "bg-[#19322b] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {filter.replace("_", " ")}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-600 font-mono px-3">
            Showing <strong className="text-slate-900">{challenges.length}</strong> challenges
          </span>
        </div>

        {/* Challenge Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#19322b]" />
            <p className="text-xs font-medium">Loading challenges catalog...</p>
          </div>
        ) : challenges.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3 shadow-sm">
            <p className="text-sm text-slate-600 font-medium">No challenges found matching the selected status filter.</p>
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
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 hover:shadow-md hover:border-slate-300 transition-all group shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 bg-slate-100 text-[#19322b] border border-slate-200 rounded text-[10px] font-bold uppercase font-mono">
                      {c.sector?.name || "General Sector"}
                    </span>
                    {getStatusBadge(c.status)}
                  </div>

                  <h2 className="text-base font-bold text-slate-900 group-hover:text-[#bd5332] transition-colors line-clamp-2">
                    {c.title}
                  </h2>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-normal">
                    {c.raw_problem_text}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Budget Ceiling</span>
                    <span className="font-mono font-bold text-emerald-800">
                      {formatBudget(c.budget_ceiling, c.currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[#bd5332] font-bold group-hover:translate-x-1 transition-transform">
                    <span>Workbench</span>
                    <ArrowRight className="w-4 h-4" />
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
