"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setCookie } from "cookies-next";
import { Lock, Mail, AlertCircle, ShieldCheck, Building2, ArrowRight, Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Language } from "@/lib/translations";

export default function Login() {
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Authentication failed. Invalid email or password.");
      }

      const data = await response.json();
      
      // Store tokens in cookies
      setCookie("token", data.access_token, { maxAge: 60 * 30 }); // 30 min
      setCookie("access_token", data.access_token, { maxAge: 60 * 30 }); // 30 min
      setCookie("refresh_token", data.refresh_token, { maxAge: 60 * 60 * 24 * 30 }); // 30 days
      
      // Fallback local storage
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const languages: { code: Language; label: string }[] = [
    { code: "en", label: "ENGLISH" },
    { code: "hi", label: "हिंदी" },
    { code: "mr", label: "मराठी" }
  ];

  const currentLangLabel = languages.find(l => l.code === language)?.label || "ENGLISH";

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="border-b-4 border-black bg-black text-white px-6 py-4 flex items-center justify-between relative z-10 font-mono">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FFD93D] text-black border-2 border-black font-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
            <Building2 className="w-5 h-5 text-black" />
          </div>
          <div>
            <span className="font-black text-white text-lg tracking-tight font-display uppercase">{t("brand_title")}</span>
            <span className="block text-[10px] text-[#FFD93D] uppercase tracking-widest font-black">{t("gov_tech_tag")}</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {/* Language Toggle */}
          <div className="relative">
            <button 
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-1.5 cursor-pointer text-white font-black hover:text-[#FFD93D] bg-black/60 px-3 py-1 border border-white/30 rounded focus:outline-none text-xs"
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

          <Link
            href="/register"
            className="px-4 py-2 bg-[#FF6B6B] hover:bg-[#ff5252] text-black border-2 border-black text-xs font-black uppercase transition-all shadow-[2px_2px_0px_0px_#000]"
          >
            {t("btn_register")}
          </Link>
        </div>
      </header>

      {/* Main Login Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10 my-8">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border-4 border-black shadow-[8px_8px_0px_0px_#000] space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FFD93D] border-2 border-black text-black shadow-[3px_3px_0px_0px_#000] mb-1">
              <ShieldCheck className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <h1 className="text-2xl font-black text-black tracking-tight uppercase font-display">
              {t("login_heading")}
            </h1>
            <p className="text-xs text-black/70 font-bold max-w-xs mx-auto">
              {t("login_subheading")}
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-[#FF6B6B]/20 border-2 border-black text-black flex items-start gap-3 text-xs leading-relaxed font-bold shadow-[2px_2px_0px_0px_#000]">
              <AlertCircle className="w-4 h-4 text-[#FF6B6B] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 font-mono">
            <div>
              <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                {t("field_email")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@test.gov.in"
                  className="w-full bg-white text-black text-xs font-bold py-2.5 pl-10 pr-4 border-2 border-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFD93D] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                {t("field_password")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white text-black text-xs font-bold py-2.5 pl-10 pr-4 border-2 border-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFD93D] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#FF6B6B] hover:bg-[#ff5252] text-black font-black uppercase text-xs py-3.5 border-3 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-black"></div>
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <span>{t("btn_login")}</span>
                  <ArrowRight className="w-4 h-4 stroke-[3px]" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t-2 border-black text-center font-mono">
            <p className="text-xs font-bold text-black">
              {t("link_no_account")}{" "}
              <Link href="/register" className="text-[#FF6B6B] hover:underline font-black">
                /register
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-black text-white py-4 text-center text-xs font-mono font-bold uppercase relative z-10">
        <p>SANKALP — Smart Innovation Procurement Platform</p>
      </footer>
    </div>
  );
}
