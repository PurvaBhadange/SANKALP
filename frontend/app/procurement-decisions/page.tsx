"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Award, ArrowRight, Loader2, Filter } from "lucide-react";

export default function ProcurementDecisionsPortfolioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [decisionFilter, setDecisionFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    loadDecisions();
  }, [decisionFilter, statusFilter]);

  async function loadDecisions() {
    setLoading(true);
    setError(null);
    try {
      let queryParams = [];
      if (decisionFilter) queryParams.push(`decision=${decisionFilter}`);
      if (statusFilter) queryParams.push(`status=${statusFilter}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const res = await fetchWithAuth(`/procurement-decisions${queryString}`);

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Failed to load procurement decisions.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setDecisions(data);
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-black pb-16 font-sans bg-halftone">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-6">
          <div>
            <div className="inline-block border-2 border-black bg-[#FFD93D] text-black px-3 py-1 font-black text-xs uppercase tracking-widest -rotate-1 shadow-[2px_2px_0px_0px_#000] mb-2">
              COMMERCIAL SCALE-UP ORDERS
            </div>
            <h1 className="text-3xl font-black text-black tracking-tight font-display uppercase flex items-center gap-2">
              <Award className="w-7 h-7 text-black stroke-[3px]" />
              Procurement Scale-Up Decisions Portfolio
            </h1>
            <p className="text-xs text-black font-bold mt-1 uppercase">
              Overview of proposed, approved, and sent-back commercial scale-up decision proposals.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 border-4 border-black shadow-[6px_6px_0px_0px_#000] flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-black stroke-[3px]" />
            <span className="text-xs font-black text-black uppercase tracking-wider">Filter Portfolio:</span>
          </div>

          <div>
            <label className="text-[10px] font-black text-black uppercase tracking-wider block mb-1">Decision Type</label>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="gov-input py-1.5 px-3 text-xs font-bold"
            >
              <option value="">All Decision Types</option>
              <option value="scale_up">Scale-Up</option>
              <option value="reject">Reject</option>
              <option value="extend_pilot">Extend Pilot</option>
              <option value="terminate">Terminate</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-black uppercase tracking-wider block mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="gov-input py-1.5 px-3 text-xs font-bold"
            >
              <option value="">All Statuses</option>
              <option value="proposed">Proposed</option>
              <option value="approved">Approved</option>
              <option value="sent_back">Sent Back</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FF6B6B] border-4 border-black text-black text-xs font-black uppercase shadow-[4px_4px_0px_0px_#000]">
            ⚠️ {error}
          </div>
        )}

        {/* Decisions List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-black gap-3 font-mono font-black">
            <Loader2 className="w-10 h-10 animate-spin text-black stroke-[3px]" />
            <p className="text-xs uppercase">Loading decisions portfolio...</p>
          </div>
        ) : decisions.length === 0 ? (
          <div className="bg-white p-12 text-center border-4 border-black shadow-[8px_8px_0px_0px_#000] space-y-3">
            <p className="text-sm text-black font-black uppercase">No procurement decisions found matching selected filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {decisions.map((d: any) => (
              <div key={d.id} className="bg-white border-4 border-black p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#000] transition-all">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-black font-display uppercase">
                      Decision: {d.decision.toUpperCase()}
                    </span>
                    <span className={`status-pill ${d.status === "approved" ? "status-published" : d.status === "sent_back" ? "status-rejected" : "status-pending"}`}>
                      {d.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-black font-bold">
                    <strong className="text-black font-black uppercase">Justification:</strong> {d.justification}
                  </p>

                  {d.contract_value && (
                    <p className="text-xs font-mono font-black text-black bg-[#86EFAC] px-1 border border-black inline-block">
                      Contract Scale-Up Value: ₹{Number(d.contract_value).toLocaleString()}
                    </p>
                  )}

                  {d.comments && (
                    <p className="text-xs text-black font-bold bg-[#FF6B6B] px-1 border border-black inline-block">
                      <strong className="font-black uppercase">Review Feedback:</strong> {d.comments}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => router.push(`/pilots/${d.pilot_id}/decision`)}
                  className="gov-btn-primary text-xs shrink-0"
                >
                  <span>View Decision Brief</span>
                  <ArrowRight className="w-4 h-4 stroke-[3px]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
