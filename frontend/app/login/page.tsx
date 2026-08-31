"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setCookie } from "cookies-next";
import { Lock, Mail, AlertCircle, ShieldCheck, Building2, ArrowRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-slate-200 bg-[#19322b] text-white px-6 py-4 flex items-center justify-between relative z-10 shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#bd5332] text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-white text-base tracking-tight font-serif">SANKALP</span>
            <span className="block text-[10px] text-emerald-200 uppercase tracking-widest font-semibold">Government Procurement Platform</span>
          </div>
        </Link>

        <Link
          href="/register"
          className="px-4 py-2 bg-[#bd5332] hover:bg-[#a64729] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          Startup Registration
        </Link>
      </header>

      {/* Main Login Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10 my-8">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#19322b]/10 border border-[#19322b]/20 text-[#19322b] mb-1">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif">
              Portal Sign In
            </h1>
            <p className="text-xs text-slate-600 max-w-xs mx-auto font-normal">
              Secure authentication for Government Officers, Evaluators, and Startups.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Official Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@test.gov.in"
                  className="gov-input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Account Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="gov-input pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 gov-btn-primary py-3"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
                  <span>Verifying Session...</span>
                </>
              ) : (
                <>
                  <span>Authenticate & Enter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              New Startup Entity?{" "}
              <Link href="/register" className="text-[#bd5332] hover:underline font-bold">
                Register Company Profile
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-600 relative z-10">
        <p>SANKALP — Smart Innovation Procurement Platform | SIH 2026</p>
      </footer>
    </div>
  );
}
