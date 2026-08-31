"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCookie } from "cookies-next";
import { ArrowLeft, Save, Loader2, Building2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";

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

export default function NewChallenge() {
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [sectorId, setSectorId] = useState("agritech");
  const [budget, setBudget] = useState("");
  const [timelineStart, setTimelineStart] = useState("");
  const [timelineEnd, setTimelineEnd] = useState("");
  const [sectors, setSectors] = useState<Sector[]>(DEFAULT_FALLBACK_SECTORS);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSectors = async () => {
      const token = getCookie("access_token") || localStorage.getItem("access_token");
      if (!token) {
        router.replace("/login");
        return;
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      try {
        const res = await fetch(`${apiUrl}/challenges/sectors`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSectors(data);
            setSectorId(data[0].id);
          }
        }
      } catch (err: any) {
        console.error("Could not retrieve sectors list from API, using default list:", err);
      }
    };

    fetchSectors();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const token = getCookie("access_token") || localStorage.getItem("access_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const payload = {
        title,
        raw_problem_text: rawText,
        sector_id: sectorId,
        budget_ceiling: budget ? parseFloat(budget) : null,
        currency: "INR",
        timeline_start: timelineStart || null,
        timeline_end: timelineEnd || null
      };

      const res = await fetch(`${apiUrl}/challenges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create challenge.");
      }

      const data = await res.json();
      router.push(`/challenges/${data.id}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16 font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-12 relative z-10">
        <div className="mb-8">
          <Link href="/challenges" className="inline-flex items-center gap-1 text-xs font-bold text-[#bd5332] hover:underline mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Challenges Catalog
          </Link>
          <h1 className="text-3xl font-bold font-serif text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-[#19322b]" />
            New Challenge Definition
          </h1>
          <p className="text-slate-600 mt-2 text-xs sm:text-sm font-normal">
            Enter the raw details of the public sector problem statement. You will be able to structure it using Gemini AI on the next page.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Challenge Title / Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Smart Agri Crop Yield Diagnostic System"
              className="gov-input"
            />
          </div>

          {/* Problem Statement */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Raw Problem Description / Statement
            </label>
            <textarea
              required
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Describe the problem, operational context, and expected targets in detail..."
              className="gov-input leading-relaxed font-normal"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tech Sector Category
              </label>
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                className="gov-input bg-white cursor-pointer"
              >
                {sectors.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Budget Ceiling (INR)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 5000000"
                className="gov-input"
              />
            </div>

            {/* Timeline Start */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Target Timeline Start
              </label>
              <input
                type="date"
                value={timelineStart}
                onChange={(e) => setTimelineStart(e.target.value)}
                className="gov-input"
              />
            </div>

            {/* Timeline End */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Target Timeline End
              </label>
              <input
                type="date"
                value={timelineEnd}
                onChange={(e) => setTimelineEnd(e.target.value)}
                className="gov-input"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="gov-btn-primary w-full py-3.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating challenge...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save & Structure Challenge with AI</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
