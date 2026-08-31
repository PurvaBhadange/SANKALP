"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCookie, deleteCookie } from "cookies-next";
import { 
  Building2, Search, Globe, HelpCircle, 
  LogOut, Menu, X, Briefcase, Layers, UserCheck, Award, ChevronDown, Sparkles
} from "lucide-react";

interface UserMe {
  id: string;
  email: string;
  full_name: string;
  department?: { id: string; name: string; code: string };
  roles: { id: string; name: string }[];
}

export function Navbar() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchMe = async () => {
      const token = getCookie("token") || getCookie("access_token") || localStorage.getItem("access_token");
      if (!token) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      try {
        const res = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setUser(await res.json());
        }
      } catch (e) {
        console.error("Failed to load current user for navbar:", e);
      }
    };
    fetchMe();
  }, [pathname]);

  const handleLogout = () => {
    deleteCookie("token");
    deleteCookie("access_token");
    deleteCookie("refresh_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    router.push("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/challenges?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/challenges");
    }
  };

  const roleNames = user?.roles?.map((r) => r.name) || [];
  const isSuperAdmin = roleNames.includes("SUPER_ADMIN");
  const isOfficer = roleNames.includes("DEPARTMENT_OFFICER");
  const isEvaluator = roleNames.includes("EVALUATOR");
  const isStartup = roleNames.includes("STARTUP_USER");
  const isProcurement = roleNames.includes("PROCUREMENT_OFFICER");

  const getPrimaryRoleBadge = () => {
    if (isSuperAdmin) return { label: "SUPER ADMIN", color: "bg-purple-100 text-purple-800 border-purple-200" };
    if (isOfficer) return { label: user?.department ? `OFFICER [${user.department.code}]` : "OFFICER", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    if (isProcurement) return { label: "PROCUREMENT", color: "bg-amber-100 text-amber-800 border-amber-200" };
    if (isEvaluator) return { label: "EVALUATOR", color: "bg-teal-100 text-teal-800 border-teal-200" };
    if (isStartup) return { label: "STARTUP PORTAL", color: "bg-orange-100 text-orange-800 border-orange-200" };
    return { label: "PORTAL USER", color: "bg-slate-100 text-slate-700 border-slate-200" };
  };

  const roleBadge = getPrimaryRoleBadge();

  return (
    <header className="w-full z-50 sticky top-0 shadow-sm font-sans border-b border-slate-200">
      {/* 1. Top Utility Header Bar */}
      <div className="bg-[#142620] text-slate-200 text-xs py-1.5 px-4 sm:px-8 border-b border-[#0f1d18] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-[11px] font-medium">
          <span className="flex items-center gap-1.5 text-amber-300 font-semibold tracking-wide">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
            GOVERNMENT OF INDIA INNOVATION PROCUREMENT PORTAL
          </span>
          <span className="hidden md:inline text-emerald-800">|</span>
          <span className="hidden md:inline text-emerald-200/80">SIH 2026 Innovation Scale-Up Runway</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] ml-auto">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-emerald-200 font-medium">Font Size:</span>
            <button className="px-1.5 py-0.5 rounded bg-[#1f3a32] border border-emerald-800 hover:bg-[#25463c] text-emerald-100 font-bold">A-</button>
            <button className="px-1.5 py-0.5 rounded bg-[#1f3a32] border border-emerald-800 hover:bg-[#25463c] text-emerald-100 font-bold">A</button>
            <button className="px-1.5 py-0.5 rounded bg-[#1f3a32] border border-emerald-800 hover:bg-[#25463c] text-emerald-100 font-bold">A+</button>
          </div>
          <span className="text-emerald-800">|</span>
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-amber-200 transition-colors">
            <Globe className="w-3.5 h-3.5 text-amber-300" />
            <span>English</span>
            <ChevronDown className="w-3 h-3 text-emerald-200" />
          </div>
          <span className="text-emerald-800">|</span>
          <Link href="/#faqs" className="flex items-center gap-1 hover:text-amber-200 transition-colors">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-200" />
            <span>Helpdesk & FAQs</span>
          </Link>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="bg-[#19322b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          
          {/* Logo & Platform Title */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#bd5332] p-0.5 shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full bg-[#19322b] rounded-[10px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-amber-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xl tracking-tight font-serif">SANKALP</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#bd5332] text-white rounded uppercase shadow-sm">
                  GOV TECH
                </span>
              </div>
              <span className="block text-[11px] text-emerald-200/90 font-medium">
                National Public Sector Innovation Marketplace
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative mx-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges, innovation sectors, startup pilots..."
              className="w-full bg-[#142620] text-white placeholder-emerald-300/60 text-xs rounded-xl py-2 pl-4 pr-10 border border-emerald-800 focus:outline-none focus:ring-2 focus:ring-[#bd5332] transition-all"
            />
            <button type="submit" className="absolute right-1 top-1 p-1.5 rounded-lg bg-[#bd5332] hover:bg-[#a64729] text-white transition-colors">
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-emerald-100">
            <Link
              href="/"
              className={`px-3 py-2 rounded-xl transition-all ${
                pathname === "/" ? "bg-[#bd5332] text-white font-bold" : "hover:bg-[#23463c] hover:text-white"
              }`}
            >
              Home
            </Link>

            <Link
              href="/challenges"
              className={`px-3 py-2 rounded-xl transition-all ${
                pathname.startsWith("/challenges") ? "bg-[#bd5332] text-white font-bold" : "hover:bg-[#23463c] hover:text-white"
              }`}
            >
              Public Challenges
            </Link>

            {(isSuperAdmin || isEvaluator) && (
              <Link
                href="/evaluator/dashboard"
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  pathname.startsWith("/evaluator") ? "bg-[#bd5332] text-white font-bold" : "hover:bg-[#23463c] hover:text-white"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>Evaluator Panel</span>
              </Link>
            )}

            {(isSuperAdmin || isStartup) && (
              <Link
                href="/startup/pilots"
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  pathname.startsWith("/startup") ? "bg-[#bd5332] text-white font-bold" : "hover:bg-[#23463c] hover:text-white"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-amber-300" />
                <span>Startup Workspace</span>
              </Link>
            )}

            {(isSuperAdmin || isProcurement || isOfficer) && (
              <Link
                href="/pilots"
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  pathname === "/pilots" || (pathname.startsWith("/pilots/") && !pathname.startsWith("/startup")) ? "bg-[#bd5332] text-white font-bold" : "hover:bg-[#23463c] hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-300" />
                <span>Pilots & Scale-Up</span>
              </Link>
            )}

            {(isSuperAdmin || isProcurement || isOfficer) && (
              <Link
                href="/procurement-decisions"
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  pathname === "/procurement-decisions" ? "bg-[#bd5332] text-white font-bold" : "hover:bg-[#23463c] hover:text-white"
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>Scale-Up Orders</span>
              </Link>
            )}
          </nav>

          {/* User Session / CTA Buttons */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-emerald-800">
                <div className="text-right">
                  <span className="block text-xs font-bold text-white leading-tight">{user.full_name}</span>
                  <span className={`inline-block px-2 py-0.5 mt-0.5 text-[9px] font-bold uppercase rounded border ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-[#142620] hover:bg-rose-900/40 border border-emerald-800 text-emerald-200 hover:text-rose-200 transition-all"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-xs font-bold text-emerald-100 hover:text-white bg-[#142620] border border-emerald-800 rounded-xl hover:bg-[#23463c] transition-all"
                >
                  Department Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-[#bd5332] hover:bg-[#a64729] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>Register Startup</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-xl bg-[#142620] border border-emerald-800 text-emerald-200 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#142620] border-b border-emerald-800 px-4 py-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges & startups..."
              className="w-full bg-[#19322b] text-white text-xs rounded-xl py-2 px-3 border border-emerald-800"
            />
          </form>
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-emerald-100 hover:bg-[#19322b]"
          >
            Home
          </Link>
          <Link
            href="/challenges"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-emerald-100 hover:bg-[#19322b]"
          >
            Public Challenges
          </Link>
          {(isSuperAdmin || isEvaluator) && (
            <Link
              href="/evaluator/dashboard"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-emerald-100 hover:bg-[#19322b]"
            >
              Evaluator Panel
            </Link>
          )}
          {(isSuperAdmin || isStartup) && (
            <Link
              href="/startup/pilots"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-emerald-100 hover:bg-[#19322b]"
            >
              Startup Workspace
            </Link>
          )}
          {(isSuperAdmin || isProcurement || isOfficer) && (
            <Link
              href="/pilots"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-emerald-100 hover:bg-[#19322b]"
            >
              Pilots & Scale-Up
            </Link>
          )}
          {user ? (
            <div className="pt-3 border-t border-emerald-800 flex justify-between items-center">
              <div>
                <span className="block text-xs font-bold text-white">{user.full_name}</span>
                <span className="text-[10px] text-emerald-300">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-rose-900/40 text-rose-300 text-xs font-bold border border-rose-800"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-emerald-800 flex gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 py-2 text-center text-xs font-bold text-emerald-100 bg-[#19322b] rounded-lg">Sign In</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="flex-1 py-2 text-center text-xs font-bold text-white bg-[#bd5332] rounded-lg">Register Startup</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
