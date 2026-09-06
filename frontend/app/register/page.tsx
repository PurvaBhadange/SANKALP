"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setCookie } from "cookies-next";
import { Building2, ArrowRight, Loader2, ArrowLeft, AlertCircle, Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Language } from "@/lib/translations";

interface Sector {
  id: string;
  name: string;
}

const DEFAULT_FALLBACK_SECTORS: Sector[] = [
  { id: "agritech", name: "AgriTech & Smart Farming" },
  { id: "smart_cities", name: "Smart Cities & Urban AI Mobility" },
  { id: "cleantech", name: "CleanTech, Water & Renewable Energy" },
  { id: "healthtech", name: "HealthTech & Medical AI" },
  { id: "cybersecurity", name: "Cybersecurity & Data Privacy" },
  { id: "defense", name: "Defense & Aerospace Tech" },
  { id: "general", name: "General Public Sector Innovation" }
];

export default function RegisterStartup() {
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [startupName, setStartupName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [sectorId, setSectorId] = useState("agritech");
  const [description, setDescription] = useState("");
  const [sectors, setSectors] = useState<Sector[]>(DEFAULT_FALLBACK_SECTORS);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSectors = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      try {
        const res = await fetch(`${apiUrl}/challenges/sectors`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSectors(data);
            setSectorId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load backend sectors, using default list:", err);
      }
    };
    fetchSectors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/auth/register-startup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          startup_name: startupName,
          registration_number: registrationNumber,
          sector_id: sectorId,
          description
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detailMsg = typeof data.detail === "string" 
          ? data.detail 
          : Array.isArray(data.detail) 
            ? data.detail.map((d: any) => d.msg || d).join(", ")
            : "Registration failed. Please verify your details.";
        throw new Error(detailMsg);
      }

      // Save tokens using standard cookie names
      setCookie("token", data.access_token, { maxAge: 60 * 60 * 24 });
      setCookie("access_token", data.access_token, { maxAge: 60 * 60 * 24 });
      setCookie("refresh_token", data.refresh_token, { maxAge: 60 * 60 * 24 * 30 });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      router.push("/dashboard");
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err.message || "Could not register startup.";
      setError(msg);
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
    <div className="min-h-screen bg-[#FFFDF5] text-black flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Top Header */}
      <header className="border-b-4 border-black bg-black text-white px-6 py-4 flex items-center justify-between relative z-10 font-mono">
        <div className="flex items-center gap-3">
          <Link href="/login" className="p-2 bg-[#FFD93D] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#ffcc00] transition-all">
            <ArrowLeft className="w-4 h-4 stroke-[3px]" />
          </Link>
          <div>
            <span className="font-black text-white text-lg tracking-tighter uppercase font-display">{t("brand_title")}</span>
            <span className="block text-[10px] text-[#FFD93D] uppercase tracking-wider font-black">Startup Onboarding</span>
          </div>
        </div>

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

          <Link href="/login" className="text-xs text-[#FFD93D] hover:underline font-black uppercase">
            {t("link_have_account")}
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 relative z-10 my-auto">
        <div className="bg-white p-6 sm:p-10 border-4 border-black shadow-[12px_12px_0px_0px_#000] space-y-6">
          <div>
            <div className="inline-block border-2 border-black bg-[#FFD93D] text-black px-3 py-1 font-black text-xs uppercase tracking-widest -rotate-1 shadow-[2px_2px_0px_0px_#000] mb-2">
              DPIIT STARTUP ONBOARDING
            </div>
            <h1 className="text-3xl font-black text-black tracking-tight font-display uppercase flex items-center gap-2">
              <Building2 className="w-7 h-7 text-black stroke-[3px]" />
              {t("btn_register")}
            </h1>
            <p className="text-xs text-black font-bold mt-1 uppercase">
              Create your startup account to enable AI semantic matching with public procurement challenges.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-[#FF6B6B] border-4 border-black text-black flex items-start gap-3 text-xs leading-relaxed font-black uppercase shadow-[4px_4px_0px_0px_#000]">
              <AlertCircle className="w-5 h-5 text-black shrink-0 mt-0.5 stroke-[3px]" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Founder Name */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
                  {t("field_full_name")}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Verma"
                  className="w-full bg-white text-black text-xs font-bold py-2.5 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFD93D] focus:outline-none"
                />
              </div>

              {/* Startup Name */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
                  Registered Startup Name
                </label>
                <input
                  type="text"
                  required
                  value={startupName}
                  onChange={(e) => setStartupName(e.target.value)}
                  placeholder="e.g. HydroSense Innovations"
                  className="w-full bg-white text-black text-xs font-bold py-2.5 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFD93D] focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
                  {t("field_email")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@startup.com"
                  className="w-full bg-white text-black text-xs font-bold py-2.5 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFD93D] focus:outline-none"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
                  {t("field_password")}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white text-black text-xs font-bold py-2.5 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFD93D] focus:outline-none"
                />
              </div>

              {/* Registration Number */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
                  DPIIT / CIN / Registration Number
                </label>
                <input
                  type="text"
                  required
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. DIPP12345 / U72900MH2024PTC123456"
                  className="w-full bg-white text-black text-xs font-bold py-2.5 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFD93D] focus:outline-none"
                />
              </div>

              {/* Primary Sector */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
                  Primary Innovation Sector
                </label>
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="w-full bg-white text-black text-xs font-bold py-2.5 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFD93D] focus:outline-none"
                >
                  {sectors.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
                Solution & Technology Abstract
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your core product technology, TRL level, patent status, and deployment capabilities..."
                className="w-full bg-white text-black text-xs font-bold py-2.5 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFD93D] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-[#FF6B6B] hover:bg-[#ff5252] text-black font-black uppercase text-xs py-4 border-3 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />
                  <span>ONBOARDING STARTUP...</span>
                </>
              ) : (
                <>
                  <span>{t("btn_register")}</span>
                  <ArrowRight className="w-4 h-4 stroke-[3px]" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-black text-white py-4 text-center text-xs font-mono font-bold uppercase relative z-10">
        <p>SANKALP — Smart Innovation Procurement Platform</p>
      </footer>
    </div>
  );
}
