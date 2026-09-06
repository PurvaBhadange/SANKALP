"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCookie, deleteCookie } from "cookies-next";
import { 
  User as UserIcon, Building, Loader2, 
  Plus, Layers, Briefcase, UserCheck, ArrowRight, Award, CheckCircle2
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Role {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  department?: Department;
  roles: Role[];
}

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const accessToken = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
      if (!accessToken) {
        router.replace("/login");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            handleLocalLogout();
            return;
          }
          throw new Error("Failed to load user profile");
        }

        const data = await response.json();
        setUser(data);
      } catch (err: any) {
        setError(err.message || "An error occurred while loading your profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleLocalLogout = () => {
    deleteCookie("token");
    deleteCookie("access_token");
    deleteCookie("refresh_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f8fafc] text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#1b3b30]" />
          <p className="text-xs text-slate-600 font-medium">Verifying user workspace credentials...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f8fafc] p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-lg">
          <h2 className="text-lg font-bold text-rose-700 mb-2">Authentication Error</h2>
          <p className="text-slate-600 text-xs mb-6">{error || "Could not retrieve user session."}</p>
          <button
            onClick={handleLocalLogout}
            className="gov-btn-primary px-6"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  const roleNames = user.roles.map((r) => r.name);
  const isSuperAdmin = roleNames.includes("SUPER_ADMIN");
  const isOfficer = roleNames.includes("DEPARTMENT_OFFICER");
  const isEvaluator = roleNames.includes("EVALUATOR");
  const isStartup = roleNames.includes("STARTUP_USER");
  const isProcurement = roleNames.includes("PROCUREMENT_OFFICER");

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-indigo-600 to-amber-500"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shrink-0 shadow-md border border-slate-800">
                <UserIcon className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-serif">
                  Welcome, {user.full_name}
                </h1>
                <p className="text-xs text-slate-600 mt-1 font-semibold flex items-center gap-2">
                  <span>SANKALP Government Innovation Procurement Workspace</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Active Session
              </span>
              {user.department && (
                <span className="px-3.5 py-1 bg-emerald-100 text-[#1b3b30] border border-emerald-300 rounded-full text-xs font-mono font-extrabold shadow-xs">
                  [{user.department.code}] {user.department.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Grid by Role */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1b3b30]"></span>
              Role Workspaces & Shortlists
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(isSuperAdmin || isOfficer || isProcurement) && (
              <Link
                href="/challenges"
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all duration-200 space-y-4 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center justify-between group-hover:text-emerald-700 transition-colors">
                      <span>Challenges Catalog</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 font-normal leading-relaxed">
                      Draft, approve, and manage public innovation procurement challenges.
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-800 font-bold">
                  <span>Public & Drafts</span>
                  <span className="px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">Catalog Workspace</span>
                </div>
              </Link>
            )}

            {(isSuperAdmin || isOfficer) && (
              <Link
                href="/challenges/new"
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all duration-200 space-y-4 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-sm">
                    <Plus className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center justify-between group-hover:text-amber-700 transition-colors">
                      <span>Create New Challenge</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 font-normal leading-relaxed">
                      Structure technical problem statements with AI assistance.
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-800 font-bold">
                  <span>AI Powered Structuring</span>
                  <span className="px-2 py-0.5 bg-amber-50 rounded border border-amber-200">Draft Wizard</span>
                </div>
              </Link>
            )}

            {(isSuperAdmin || isEvaluator) && (
              <Link
                href="/evaluator/dashboard"
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-cyan-400 transition-all duration-200 space-y-4 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-sm">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center justify-between group-hover:text-cyan-700 transition-colors">
                      <span>Evaluator Panel</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 font-normal leading-relaxed">
                      Review assigned applicant proposals with blind scoring & SHA-256 hash chains.
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-cyan-800 font-bold">
                  <span>Cryptographic Integrity</span>
                  <span className="px-2 py-0.5 bg-cyan-50 rounded border border-cyan-200">Blind Scoring</span>
                </div>
              </Link>
            )}

            {(isSuperAdmin || isStartup) && (
              <Link
                href="/startup/matches"
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-400 transition-all duration-200 space-y-4 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center justify-between group-hover:text-purple-700 transition-colors">
                      <span>Semantic Match Finder</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 font-normal leading-relaxed">
                      Find challenges that match your startup's core technological profile.
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-purple-800 font-bold">
                  <span>pgvector Vector AI</span>
                  <span className="px-2 py-0.5 bg-purple-50 rounded border border-purple-200">Similarity Engine</span>
                </div>
              </Link>
            )}

            {(isSuperAdmin || isStartup) && (
              <Link
                href="/startup/pilots"
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-rose-400 transition-all duration-200 space-y-4 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-sm">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center justify-between group-hover:text-rose-700 transition-colors">
                      <span>Startup Pilots Tracker</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 font-normal leading-relaxed">
                      Report milestone evidence and track KPI measurements.
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-rose-800 font-bold">
                  <span>Milestone Evidence</span>
                  <span className="px-2 py-0.5 bg-rose-50 rounded border border-rose-200">KPI Tracking</span>
                </div>
              </Link>
            )}

            {(isSuperAdmin || isProcurement || isOfficer) && (
              <Link
                href="/pilots"
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all duration-200 space-y-4 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center justify-between group-hover:text-indigo-700 transition-colors">
                      <span>Pilot & Contract Management</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 font-normal leading-relaxed">
                      Draft contract terms, verify payment stages, and analyze KPI performance.
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-800 font-bold">
                  <span>Scale-Up & Contracts</span>
                  <span className="px-2 py-0.5 bg-indigo-50 rounded border border-indigo-200">Procurement Module</span>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* User Account Details Section */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            User Account Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-mono font-bold mb-1">Email Address</span>
              <span className="text-slate-900 font-bold text-sm block">{user.email}</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-mono font-bold mb-1">Assigned Department</span>
              <span className="text-slate-900 font-bold text-xs block">
                {user.department ? `${user.department.name} (${user.department.code})` : "None"}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-mono font-bold mb-1">Assigned Roles</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {user.roles.map((r) => (
                  <span key={r.id} className="px-2.5 py-1 bg-indigo-100 text-indigo-900 rounded-lg border border-indigo-200 text-[10px] font-mono font-extrabold shadow-xs">
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
