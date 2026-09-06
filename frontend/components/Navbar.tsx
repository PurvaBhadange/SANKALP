"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCookie, deleteCookie } from "cookies-next";
import { 
  Building2, Search, Globe, HelpCircle, 
  LogOut, Menu, X, Briefcase, Layers, UserCheck, ChevronDown, Sparkles, Check
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Language } from "@/lib/translations";

interface UserMe {
  id: string;
  email: string;
  full_name: string;
  department?: { id: string; name: string; code: string };
  roles: { id: string; name: string }[];
}

export function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const [user, setUser] = useState<UserMe | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    if (isSuperAdmin) return { label: t("role_super_admin"), color: "bg-[#C4B5FD] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
    if (isOfficer) return { label: user?.department ? `${t("role_officer")} [${user.department.code}]` : t("role_officer"), color: "bg-[#FFD93D] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
    if (isProcurement) return { label: t("role_procurement"), color: "bg-[#FFD93D] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
    if (isEvaluator) return { label: t("role_evaluator"), color: "bg-[#7DD3FC] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
    if (isStartup) return { label: t("role_startup"), color: "bg-[#FF6B6B] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
    return { label: t("role_user"), color: "bg-white text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]" };
  };

  const roleBadge = getPrimaryRoleBadge();

  const languages: { code: Language; label: string; name: string }[] = [
    { code: "en", label: "ENGLISH", name: "English" },
    { code: "hi", label: "हिंदी", name: "Hindi" },
    { code: "mr", label: "मराठी", name: "Marathi" }
  ];

  const currentLangLabel = languages.find(l => l.code === language)?.label || "ENGLISH";

  return (
    <header className="w-full z-50 sticky top-0 font-sans border-b-4 border-black bg-black">
      {/* 1. Top Utility Header Bar */}
      <div className="bg-black text-white text-xs py-2 px-4 sm:px-8 border-b-2 border-white/20 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-4 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-[#FFD93D] font-black tracking-wide">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FF6B6B] border border-black"></span>
            {t("portal_subtitle")}
          </span>
          <span className="hidden md:inline text-white/40">|</span>
          <span className="hidden md:inline text-white/90 font-bold uppercase">{t("scaleup_runway")}</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] ml-auto">
          {/* Language Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-1.5 cursor-pointer text-white font-black hover:text-[#FFD93D] bg-black/40 px-2 py-0.5 border border-white/30 rounded focus:outline-none"
            >
              <Globe className="w-3.5 h-3.5 text-[#FFD93D]" />
              <span className="tracking-wider">{currentLangLabel}</span>
              <ChevronDown className={`w-3 h-3 text-white transition-transform ${langDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-[#FFFDF5] text-black border-3 border-black shadow-[4px_4px_0px_0px_#000] py-1 z-50 font-mono">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-black flex items-center justify-between hover:bg-[#FFD93D] transition-all ${
                      language === lang.code ? "bg-[#FF6B6B] text-black" : "text-black"
                    }`}
                  >
                    <span>{lang.label}</span>
                    {language === lang.code && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-white/40">|</span>

          <Link href="/faqs" className="flex items-center gap-1 text-white font-bold hover:text-[#FFD93D]">
            <HelpCircle className="w-3.5 h-3.5 text-[#FFD93D]" />
            <span>{t("helpdesk_faqs")}</span>
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
                <span className="font-black text-black text-2xl tracking-tighter uppercase font-display">{t("brand_title")}</span>
                <span className="text-[10px] font-black px-2 py-0.5 bg-[#FF6B6B] text-black border-2 border-black uppercase shadow-[2px_2px_0px_0px_#000]">
                  {t("gov_tech_tag")}
                </span>
              </div>
              <span className="block text-[11px] text-black/80 font-black uppercase tracking-wider">
                {t("platform_tagline")}
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative mx-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_placeholder")}
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
              {t("nav_home")}
            </Link>

            <Link
              href="/challenges"
              className={`px-3 py-2 border-2 border-black transition-all ${
                pathname.startsWith("/challenges") ? "bg-[#FF6B6B] text-black shadow-[3px_3px_0px_0px_#000]" : "bg-white hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000]"
              }`}
            >
              {t("nav_challenges")}
            </Link>

            {(isSuperAdmin || isEvaluator) && (
              <Link
                href="/evaluator/dashboard"
                className={`px-3 py-2 border-2 border-black transition-all flex items-center gap-1.5 ${
                  pathname.startsWith("/evaluator") ? "bg-[#FF6B6B] text-black shadow-[3px_3px_0px_0px_#000]" : "bg-white hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000]"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 stroke-[3px]" />
                <span>{t("role_evaluator")}</span>
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
                <span>{t("nav_startups")}</span>
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
                <span>{t("nav_pilots")}</span>
              </Link>
            )}

            <Link
              href="/faqs"
              className={`px-3 py-2 border-2 border-black transition-all flex items-center gap-1.5 ${
                pathname === "/faqs" ? "bg-[#FFD93D] text-black shadow-[3px_3px_0px_0px_#000]" : "bg-white hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000]"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 stroke-[3px]" />
              <span>{t("nav_faqs")}</span>
            </Link>
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
                  title={t("btn_logout")}
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
                  {t("btn_login")}
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-2 bg-[#FF6B6B] text-black text-xs font-black uppercase border-3 border-black shadow-[3px_3px_0px_0px_#000] hover:bg-[#ff5252] transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 stroke-[3px]" />
                  <span>{t("btn_register")}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-xl bg-black border border-white/20 text-slate-200 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-black text-white border-b-4 border-black px-4 py-4 space-y-3 font-sans">
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_placeholder")}
              className="w-full bg-white text-black text-xs font-bold py-2 px-3 border-2 border-black"
            />
          </form>
          <div className="flex items-center justify-between py-2 border-b border-white/20">
            <span className="text-xs font-mono font-bold text-[#FFD93D]">LANGUAGE:</span>
            <div className="flex items-center gap-2">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-2 py-1 text-[10px] font-black border border-white ${language === l.code ? "bg-[#FF6B6B] text-black" : "bg-black text-white"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-bold text-white hover:text-[#FFD93D]"
          >
            {t("nav_home")}
          </Link>
          <Link
            href="/challenges"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-bold text-white hover:text-[#FFD93D]"
          >
            {t("nav_challenges")}
          </Link>
          <Link
            href="/faqs"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-bold text-white hover:text-[#FFD93D]"
          >
            {t("nav_faqs")}
          </Link>
        </div>
      )}
    </header>
  );
}
