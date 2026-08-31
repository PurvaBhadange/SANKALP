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
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1b3b30] text-white flex items-center justify-center shrink-0 shadow-sm">
                <UserIcon className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif">
                  Welcome, {user.full_name}
                </h1>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  SANKALP Government Innovation Procurement Workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="status-pill status-active">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active Session
              </span>
              {user.department && (
                <span className="px-3 py-1 bg-emerald-50 text-[#1b3b30] border border-emerald-200 rounded-full text-xs font-mono font-bold">
                  [{user.department.code}] {user.department.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Grid by Role */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
            Role Workspaces & Shortlists
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(isSuperAdmin || isOfficer || isProcurement) && (
              <Link
                href="/challenges"
                className="gov-card-interactive p-6 space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1b3b30]/10 border border-[#1b3b30]/20 text-[#1b3b30] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center justify-between">
                    <span>Challenges Catalog</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#c85a32] transition-colors" />
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 font-normal">
                    Draft, approve, and manage public innovation procurement challenges.
                  </p>
                </div>
              </Link>
            )}

            {(isSuperAdmin || isOfficer) && (
              <Link
                href="/challenges/new"
                className="gov-card-interactive p-6 space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#c85a32]/10 border border-[#c85a32]/20 text-[#c85a32] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center justify-between">
                    <span>Create New Challenge</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#c85a32] transition-colors" />
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 font-normal">
                    Structure technical problem statements with AI assistance.
                  </p>
                </div>
              </Link>
            )}

            {(isSuperAdmin || isEvaluator) && (
              <Link
                href="/evaluator/dashboard"
                className="gov-card-interactive p-6 space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center justify-between">
                    <span>Evaluator Panel</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#c85a32] transition-colors" />
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 font-normal">
                    Review assigned applicant proposals with blind scoring & SHA-256 hash chains.
                  </p>
                </div>
              </Link>
            )}

            {(isSuperAdmin || isStartup) && (
              <Link
                href="/startup/matches"
                className="gov-card-interactive p-6 space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center justify-between">
                    <span>Semantic Match Finder</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#c85a32] transition-colors" />
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 font-normal">
                    Find challenges that match your startup's core technological profile.
                  </p>
                </div>
              </Link>
            )}

            {(isSuperAdmin || isStartup) && (
              <Link
                href="/startup/pilots"
                className="gov-card-interactive p-6 space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center justify-between">
                    <span>Startup Pilots Tracker</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#c85a32] transition-colors" />
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 font-normal">
                    Report milestone evidence and track KPI measurements.
                  </p>
                </div>
              </Link>
            )}

            {(isSuperAdmin || isProcurement || isOfficer) && (
              <Link
                href="/pilots"
                className="gov-card-interactive p-6 space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center justify-between">
                    <span>Pilot & Contract Management</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#c85a32] transition-colors" />
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 font-normal">
                    Draft contract terms, verify payment stages, and analyze KPI performance.
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* User Account Details Section */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono border-b border-slate-100 pb-3">
            User Account Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Email Address</span>
              <span className="text-slate-900 font-semibold">{user.email}</span>
            </div>

            <div>
              <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Assigned Department</span>
              <span className="text-slate-900 font-semibold">
                {user.department ? `${user.department.name} (${user.department.code})` : "None"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Assigned Roles</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {user.roles.map((r) => (
                  <span key={r.id} className="px-2 py-0.5 bg-slate-100 text-[#1b3b30] rounded border border-slate-200 text-[10px] font-mono font-bold">
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
