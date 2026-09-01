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
    <div className="min-h-screen bg-[#FFFDF5] text-black pb-16 font-sans bg-halftone">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-6">
          <div>
            <div className="inline-block border-2 border-black bg-[#FFD93D] text-black px-3 py-1 font-black text-xs uppercase tracking-widest -rotate-1 shadow-[2px_2px_0px_0px_#000] mb-2">
              DEPLOYMENT & WORKBENCH TRACKER
            </div>
            <h1 className="text-3xl font-black text-black tracking-tight font-display uppercase flex items-center gap-2">
              <Layers className="w-7 h-7 text-black stroke-[3px]" />
              Pilot Deployments & Contract Tracker
            </h1>
            <p className="text-xs text-black font-bold mt-1 uppercase">
              Oversee active pilot projects, finalize terms, execute dual-authorization payments, and evaluate performance narratives.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FF6B6B] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-black gap-3 font-mono font-black">
            <Loader2 className="w-10 h-10 animate-spin text-black stroke-[3px]" />
            <p className="text-xs uppercase">Loading pilot deployments list...</p>
          </div>
        ) : pilots.length === 0 ? (
          <div className="bg-white p-12 text-center border-4 border-black shadow-[8px_8px_0px_0px_#000] space-y-3">
            <Building2 className="w-12 h-12 text-black mx-auto stroke-[3px]" />
            <h3 className="text-lg font-black text-black font-display uppercase">No Active Pilot Projects Found</h3>
            <p className="text-xs text-black font-bold max-w-sm mx-auto leading-relaxed uppercase">
              When applications are selected for pilots from challenge evaluation panels, they will appear here for contract drafting.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pilots.map((p) => (
              <div key={p.id} className="bg-white border-4 border-black p-6 flex flex-col justify-between space-y-4 shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1.5 hover:shadow-[12px_12px_0px_0px_#000] transition-all group">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2.5 py-1 bg-[#FFD93D] text-black border-2 border-black text-[10px] font-mono font-black uppercase shadow-[2px_2px_0px_0px_#000]">
                      {p.application?.challenge?.sector?.name || "Innovation Sector"}
                    </span>
                    <span className={`status-pill ${p.contract_status === "finalized" ? "status-published" : "status-pending"}`}>
                      Contract: {p.contract_status}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-black group-hover:bg-[#FF6B6B] transition-colors uppercase leading-snug">
                    {p.application?.challenge?.title || "Challenge Pilot"}
                  </h3>

                  <p className="text-xs text-black font-bold">
                    Startup: <strong className="text-black bg-[#C4B5FD] px-1 border border-black font-black uppercase">{p.application?.startup?.name || "Selected Startup"}</strong>
                  </p>
                </div>

                <div className="pt-3 border-t-3 border-black flex items-center justify-between text-xs font-mono font-black">
                  <div>
                    <span className="text-[10px] text-black/70 block uppercase font-bold">Total Pilot Budget</span>
                    <span className="font-mono font-black text-black bg-[#86EFAC] px-1 border border-black inline-block">
                      ₹{p.budget ? Number(p.budget).toLocaleString() : "TBD"}
                    </span>
                  </div>

                  <Link
                    href={`/pilots/${p.id}`}
                    className="gov-btn-primary text-xs"
                  >
                    <span>Manage Pilot Workbench</span>
                    <ArrowRight className="w-4 h-4 stroke-[3px]" />
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
