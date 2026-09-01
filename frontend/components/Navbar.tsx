"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCookie, deleteCookie } from "cookies-next";
import { 
  Building2, Search, Globe, HelpCircle, 
  LogOut, Menu, X, Briefcase, Layers, UserCheck, Award, ChevronDown, Sparkles,
  Palette
} from "lucide-react";
import { useTheme, ThemeMode } from "@/components/ThemeProvider";

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
  const { theme, setTheme } = useTheme();

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
    if (isSuperAdmin) return { label: "SUPER ADMIN", color: "bg-[#C4B5FD] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
    if (isOfficer) return { label: user?.department ? `OFFICER [${user.department.code}]` : "OFFICER", color: "bg-[#86EFAC] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
    if (isProcurement) return { label: "PROCUREMENT", color: "bg-[#FFD93D] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
    if (isEvaluator) return { label: "EVALUATOR", color: "bg-[#7DD3FC] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
    if (isStartup) return { label: "STARTUP PORTAL", color: "bg-[#FF6B6B] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
    return { label: "PORTAL USER", color: "bg-white text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
  };

  const roleBadge = getPrimaryRoleBadge();

  return (
    <header className="w-full z-50 sticky top-0 font-sans border-b-4 border-black bg-black">
      {/* 1. Top Utility Header Bar with Theme Switcher */}
      <div className="bg-black text-white text-xs py-2 px-4 sm:px-8 border-b-2 border-white/20 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-4 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-[#FFD93D] font-black tracking-wide">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FF6B6B] border border-black"></span>
            GOVERNMENT OF INDIA INNOVATION PORTAL
          </span>
          <span className="hidden md:inline text-white/40">|</span>
          <span className="hidden md:inline text-white/90 font-bold uppercase">SIH 2026 Innovation Scale-Up Runway</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] ml-auto">
          {/* THEME SELECTOR DROPDOWN */}
          <div className="flex items-center gap-1.5 font-black text-[#FFD93D]">
            <Palette className="w-3.5 h-3.5 text-[#FF6B6B]" />
            <span>THEME:</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeMode)}
              className="bg-[#FFD93D] text-black text-[11px] font-black uppercase px-2 py-0.5 border-2 border-black focus:outline-none cursor-pointer shadow-[2px_2px_0px_0px_#000]"
            >
              <option value="thub" className="bg-white text-black font-bold">⚡ NEO-BRUTALIST (DEFAULT)</option>
              <option value="govizo" className="bg-white text-black font-bold">🏛️ GOVIZO (Navy & Crimson)</option>
              <option value="light" className="bg-white text-black font-bold">💼 ENTERPRISE (Slate Blue)</option>
            </select>
          </div>

          <span className="text-white/40">|</span>

          <div className="flex items-center gap-1.5 cursor-pointer text-white font-bold hover:text-[#FFD93D]">
            <Globe className="w-3.5 h-3.5 text-[#FFD93D]" />
            <span>ENGLISH</span>
            <ChevronDown className="w-3 h-3 text-white" />
          </div>

          <span className="text-white/40">|</span>

          <Link href="/#faqs" className="flex items-center gap-1 text-white font-bold hover:text-[#FFD93D]">
            <HelpCircle className="w-3.5 h-3.5 text-[#FFD93D]" />
            <span>HELPDESK & FAQS</span>
          </Link>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="bg-[#FFFDF5] text-black border-t-2 border-black py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          
          {/* Logo & Platform Title */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-11 h-11 bg-[#FFD93D] border-4 border-black p-1 shadow-[4px_4px_0px_0px_#000] group-hover:-translate-y-0.5 group-hover:shadow-[6px_6px_0px_0px_#000] transition-all flex items-center justify-center">
              <Building2 className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-black text-2xl tracking-tighter uppercase font-display">SANKALP</span>
                <span className="text-[10px] font-black px-2 py-0.5 bg-[#FF6B6B] text-black border-2 border-black uppercase shadow-[2px_2px_0px_0px_#000]">
                  GOV TECH
                </span>
              </div>
              <span className="block text-[11px] text-black/80 font-black uppercase tracking-wider">
                National Innovation Marketplace
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative mx-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges, sectors, pilots..."
              className="w-full bg-white text-black placeholder-gray-500 text-xs font-bold py-2.5 pl-4 pr-10 border-4 border-black shadow-[4px_4px_0px_0px_#000] focus:bg-[#FFD93D] focus:outline-none transition-all"
            />
            <button type="submit" className="absolute right-1.5 top-1.5 p-1.5 bg-[#FF6B6B] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#ff5252] transition-all">
              <Search className="w-3.5 h-3.5 stroke-[3px]" />
            </button>
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
            <Link
              href="/"
              className={`px-3 py-2 border-2 border-black transition-all ${
                pathname === "/" ? "bg-[#FF6B6B] text-black shadow-[3px_3px_0px_0px_#000]" : "bg-white hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000]"
              }`}
            >
              Home
            </Link>

            <Link
              href="/challenges"
              className={`px-3 py-2 border-2 border-black transition-all ${
                pathname.startsWith("/challenges") ? "bg-[#FF6B6B] text-black shadow-[3px_3px_0px_0px_#000]" : "bg-white hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000]"
              }`}
            >
              Challenges
            </Link>

            {(isSuperAdmin || isEvaluator) && (
              <Link
                href="/evaluator/dashboard"
                className={`px-3 py-2 border-2 border-black transition-all flex items-center gap-1.5 ${
                  pathname.startsWith("/evaluator") ? "bg-[#FF6B6B] text-black shadow-[3px_3px_0px_0px_#000]" : "bg-white hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000]"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 stroke-[3px]" />
                <span>Evaluator</span>
              </Link>
            )}

            {(isSuperAdmin || isStartup) && (
              <Link
                href="/startup/pilots"
                className={`px-3 py-2 border-2 border-black transition-all flex items-center gap-1.5 ${
                  pathname.startsWith("/startup") ? "bg-[#FF6B6B] text-black shadow-[3px_3px_0px_0px_#000]" : "bg-white hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000]"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 stroke-[3px]" />
                <span>Startup</span>
              </Link>
            )}

            {(isSuperAdmin || isProcurement || isOfficer) && (
              <Link
                href="/pilots"
                className={`px-3 py-2 border-2 border-black transition-all flex items-center gap-1.5 ${
                  pathname === "/pilots" || (pathname.startsWith("/pilots/") && !pathname.startsWith("/startup")) ? "bg-[#FF6B6B] text-black shadow-[3px_3px_0px_0px_#000]" : "bg-white hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000]"
                }`}
              >
                <Layers className="w-3.5 h-3.5 stroke-[3px]" />
                <span>Pilots</span>
              </Link>
            )}

            {(isSuperAdmin || isProcurement || isOfficer) && (
              <Link
                href="/procurement-decisions"
                className={`px-3 py-2 border-2 border-black transition-all flex items-center gap-1.5 ${
                  pathname === "/procurement-decisions" ? "bg-[#FF6B6B] text-black shadow-[3px_3px_0px_0px_#000]" : "bg-white hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000]"
                }`}
              >
                <Award className="w-3.5 h-3.5 stroke-[3px]" />
                <span>Scale-Up</span>
              </Link>
            )}
          </nav>

          {/* User Session / CTA Buttons */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l-4 border-black">
                <div className="text-right">
                  <span className="block text-xs font-black text-black uppercase leading-tight">{user.full_name}</span>
                  <span className={`inline-block px-2 py-0.5 mt-0.5 text-[9px] font-black uppercase border-2 border-black ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 bg-[#FF6B6B] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#ff5252] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4 stroke-[3px]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-xs font-black uppercase text-black bg-white border-3 border-black shadow-[3px_3px_0px_0px_#000] hover:bg-[#FFD93D] transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-2 bg-[#FF6B6B] text-black text-xs font-black uppercase border-3 border-black shadow-[3px_3px_0px_0px_#000] hover:bg-[#ff5252] transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 stroke-[3px]" />
                  <span>Register Startup</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-xl bg-black/20 border border-white/20 text-slate-200 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden theme-header-dark border-b border-black/20 px-4 py-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges & startups..."
              className="w-full bg-black/20 text-white text-xs rounded-xl py-2 px-3 border border-white/20"
            />
          </form>
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-100 hover:bg-black/20"
          >
            Home
          </Link>
          <Link
            href="/challenges"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-100 hover:bg-black/20"
          >
            Public Challenges
          </Link>
          {(isSuperAdmin || isEvaluator) && (
            <Link
              href="/evaluator/dashboard"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-100 hover:bg-black/20"
            >
              Evaluator Panel
            </Link>
          )}
          {(isSuperAdmin || isStartup) && (
            <Link
              href="/startup/pilots"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-100 hover:bg-black/20"
            >
              Startup Workspace
            </Link>
          )}
          {(isSuperAdmin || isProcurement || isOfficer) && (
            <Link
              href="/pilots"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-100 hover:bg-black/20"
            >
              Pilots & Scale-Up
            </Link>
          )}
          {user ? (
            <div className="pt-3 border-t border-white/20 flex justify-between items-center">
              <div>
                <span className="block text-xs font-bold text-white">{user.full_name}</span>
                <span className="text-[10px] text-slate-300">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-rose-900/40 text-rose-300 text-xs font-bold border border-rose-800"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-white/20 flex gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 py-2 text-center text-xs font-bold text-slate-100 bg-black/20 rounded-lg">Sign In</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="flex-1 py-2 text-center text-xs font-bold text-white theme-accent-bg rounded-lg">Register Startup</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
