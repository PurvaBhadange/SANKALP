"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Loader2, Building2, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { fetchWithAuth } from "@/lib/api";

export default function GlobalPilotsListPage() {
  const [pilots, setPilots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPilots() {
      try {
        const res = await fetchWithAuth("/pilots");
        if (res.ok) {
          setPilots(await res.json());
        } else {
          setError("Failed to fetch pilot projects.");
        }
      } catch (e) {
        setError("Network error fetching pilot list.");
      } finally {
        setLoading(false);
      }
    }
    fetchPilots();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#19322b]" />
              Pilot Deployments & Contract Tracker
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Oversee active pilot projects, finalize terms, execute dual-authorization payments, and evaluate performance narratives.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#19322b]" />
            <p className="text-xs font-medium">Loading pilot deployments list...</p>
          </div>
        ) : pilots.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3 shadow-sm">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 font-serif">No Active Pilot Projects Found</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed font-normal">
              When applications are selected for pilots from challenge evaluation panels, they will appear here for contract drafting.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pilots.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-all group shadow-sm">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2.5 py-0.5 bg-slate-100 text-[#19322b] border border-slate-200 rounded text-[10px] font-mono font-bold uppercase">
                      {p.application?.challenge?.sector?.name || "Innovation Sector"}
                    </span>
                    <span className={`status-pill ${p.contract_status === "finalized" ? "status-published" : "status-pending"}`}>
                      Contract: {p.contract_status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#bd5332] transition-colors">
                    {p.application?.challenge?.title || "Challenge Pilot"}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 font-normal">
                    Startup: <strong className="text-slate-900 font-semibold">{p.application?.startup?.name || "Selected Startup"}</strong>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Total Pilot Budget</span>
                    <span className="font-mono font-bold text-emerald-800">
                      ₹{p.budget ? Number(p.budget).toLocaleString() : "TBD"}
                    </span>
                  </div>

                  <Link
                    href={`/pilots/${p.id}`}
                    className="gov-btn-primary text-xs"
                  >
                    <span>Manage Pilot Workbench</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
