"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setCookie } from "cookies-next";
import { Building2, ArrowRight, Loader2, ArrowLeft, AlertCircle } from "lucide-react";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [startupName, setStartupName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [sectorId, setSectorId] = useState("agritech");
  const [description, setDescription] = useState("");
  const [sectors, setSectors] = useState<Sector[]>(DEFAULT_FALLBACK_SECTORS);

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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-[#19322b] text-white px-6 py-4 flex items-center justify-between relative z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/login" className="p-2 rounded-xl bg-[#142620] hover:bg-[#23463c] text-emerald-200 hover:text-white border border-emerald-800 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="font-extrabold text-white text-base tracking-tight font-serif">SANKALP</span>
            <span className="block text-[10px] text-emerald-200 uppercase tracking-wider">Startup Onboarding</span>
          </div>
        </div>

        <Link href="/login" className="text-xs text-amber-300 hover:underline font-bold">
          Already registered? Sign In
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 relative z-10 my-auto">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#19322b]" />
              Startup Entity Registration
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-normal">
              Create your startup account to enable AI semantic matching with public procurement challenges.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs leading-relaxed font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Founder Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Contact / Founder Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Verma"
                  className="gov-input"
                />
              </div>

              {/* Startup Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Registered Startup Name
                </label>
                <input
                  type="text"
                  required
                  value={startupName}
                  onChange={(e) => setStartupName(e.target.value)}
                  placeholder="e.g. HydroSense Innovations"
                  className="gov-input"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@hydrosense.in"
                  className="gov-input"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Account Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="gov-input"
                />
              </div>

              {/* Reg Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Registration / CIN Number
                </label>
                <input
                  type="text"
                  required
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. REG-2026-8819"
                  className="gov-input font-mono"
                />
              </div>

              {/* Sector Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Technology Sector
                </label>
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="gov-input bg-white cursor-pointer"
                >
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Startup Product & Core Solution Summary
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your core product, technology stack, IoT sensors, AI models, or domain expertise..."
                className="gov-input"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="gov-btn-primary w-full md:w-auto px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Startup Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-600 relative z-10">
        <p>SANKALP — Smart Innovation Procurement Platform | SIH 2026</p>
      </footer>
    </div>
  );
}
