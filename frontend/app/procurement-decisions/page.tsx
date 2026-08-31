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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
              <Award className="w-6 h-6 text-[#19322b]" />
              Procurement Scale-Up Decisions Portfolio
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Overview of proposed, approved, and sent-back commercial scale-up decision proposals.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filter Portfolio:</span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Decision Type</label>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="gov-input py-1.5 px-3 text-xs"
            >
              <option value="">All Decision Types</option>
              <option value="scale_up">Scale-Up</option>
              <option value="reject">Reject</option>
              <option value="extend_pilot">Extend Pilot</option>
              <option value="terminate">Terminate</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="gov-input py-1.5 px-3 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="proposed">Proposed</option>
              <option value="approved">Approved</option>
              <option value="sent_back">Sent Back</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Decisions List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#19322b]" />
            <p className="text-xs font-medium">Loading decisions portfolio...</p>
          </div>
        ) : decisions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3 shadow-sm">
            <p className="text-sm text-slate-600 font-medium">No procurement decisions found matching selected filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {decisions.map((d: any) => (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm hover:shadow-md transition-all">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-slate-900 font-serif">
                      Decision: {d.decision.toUpperCase()}
                    </span>
                    <span className={`status-pill ${d.status === "approved" ? "status-published" : d.status === "sent_back" ? "status-rejected" : "status-pending"}`}>
                      {d.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-normal">
                    <strong className="text-slate-900 font-semibold">Justification:</strong> {d.justification}
                  </p>

                  {d.contract_value && (
                    <p className="text-xs font-mono font-bold text-emerald-800">
                      Contract Scale-Up Value: ₹{Number(d.contract_value).toLocaleString()}
                    </p>
                  )}

                  {d.comments && (
                    <p className="text-xs text-rose-700 font-normal">
                      <strong className="font-semibold">Review Feedback:</strong> {d.comments}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => router.push(`/pilots/${d.pilot_id}/decision`)}
                  className="gov-btn-primary text-xs shrink-0"
                >
                  <span>View Decision Brief</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
