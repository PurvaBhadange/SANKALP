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
    <div className="min-h-screen bg-[#FFFDF5] text-black flex flex-col justify-between relative overflow-hidden font-sans bg-halftone">
      {/* Top Header */}
      <header className="border-b-4 border-black bg-black text-white px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <Link href="/login" className="p-2 bg-[#FFD93D] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#ffcc00] transition-all">
            <ArrowLeft className="w-4 h-4 stroke-[3px]" />
          </Link>
          <div>
            <span className="font-black text-white text-lg tracking-tighter uppercase font-display">SANKALP</span>
            <span className="block text-[10px] text-[#FFD93D] uppercase tracking-wider font-black">Startup Onboarding</span>
          </div>
        </div>

        <Link href="/login" className="text-xs text-[#FFD93D] hover:underline font-black uppercase">
          Already registered? Sign In
        </Link>
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
              Startup Entity Registration
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Founder Name */}
              <div>
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
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
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
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
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
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
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
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
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
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
                <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
                  Primary Technology Sector
                </label>
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="gov-input bg-white cursor-pointer font-bold"
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
              <label className="block text-xs font-black text-black uppercase tracking-wider mb-1">
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
                    <Loader2 className="w-5 h-5 animate-spin stroke-[3px]" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-5 h-5 stroke-[3px]" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-black py-4 text-center text-xs text-white font-mono font-bold uppercase relative z-10">
        <p>SANKALP — Smart Innovation Procurement Platform | SIH 2026</p>
      </footer>
    </div>
  );
}
