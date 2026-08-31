"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Building2, CheckCircle2, Upload, 
  Loader2, AlertTriangle
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { fetchWithAuth } from "@/lib/api";

export default function StartupPilotsPage() {
  const [pilots, setPilots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Evidence upload modal state
  const [evidenceMsId, setEvidenceMsId] = useState<string | null>(null);
  const [evidenceDocId, setEvidenceDocId] = useState("");

  const fetchMyPilots = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth("/startups/me/pilots");
      if (res.ok) {
        setPilots(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to load startup pilots.");
      }
    } catch (e) {
      setError("Network error loading pilots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPilots();
  }, []);

  const handleSubmitEvidence = async () => {
    if (!evidenceMsId || !evidenceDocId.trim()) return;
    setActionLoading(`evidence-${evidenceMsId}`);
    setError(null);

    try {
      const res = await fetchWithAuth(`/milestones/${evidenceMsId}/submit-evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence_document_id: evidenceDocId })
      });
      if (res.ok) {
        setEvidenceMsId(null);
        setEvidenceDocId("");
        setSuccessMsg("Milestone evidence submitted successfully! Pending officer review.");
        fetchMyPilots();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to submit milestone evidence.");
      }
    } catch (e) {
      setError("Network error submitting evidence.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-serif flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#19322b]" />
              Startup Pilot Projects & Contract Workspace
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Track active pilot contracts, submit milestone deliverables, and monitor payments.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#19322b]" />
            <p className="text-xs font-medium">Loading startup pilot deployments...</p>
          </div>
        ) : pilots.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3 shadow-sm">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 font-serif">No Active Pilot Deployments</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed font-normal">
              You currently do not have any active pilot deployments. Submit applications to challenges to be selected for pilot execution.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pilots.map((pilot) => (
              <div key={pilot.id} className="bg-white rounded-2xl p-6 space-y-6 border border-slate-200 shadow-sm">
                {/* Top Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-3 flex-wrap">
                      <span>{pilot.application?.challenge?.title || "Challenge Pilot"}</span>
                      {pilot.contract_status === "finalized" && (
                        <Link
                          href={`/startup/pilots/${pilot.id}`}
                          className="gov-btn-primary text-xs py-1"
                        >
                          Track KPIs & Metrics
                        </Link>
                      )}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 font-mono">
                      Start: {pilot.start_date || "TBD"} | End: {pilot.end_date || "TBD"} | Budget: ₹{pilot.budget ? Number(pilot.budget).toLocaleString() : "TBD"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`status-pill ${pilot.contract_status === "finalized" ? "status-published" : "status-pending"}`}>
                      Contract: {pilot.contract_status}
                    </span>
                    <span className="status-pill status-active">
                      Status: {pilot.status}
                    </span>
                  </div>
                </div>

                {/* Terms Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Approved IP Ownership Terms:</span>
                    <p className="text-slate-800 mt-1 font-normal">{pilot.ip_ownership_terms || "Pending officer configuration."}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Approved Data Ownership Terms:</span>
                    <p className="text-slate-800 mt-1 font-normal">{pilot.data_ownership_terms || "Pending officer configuration."}</p>
                  </div>
                </div>

                {/* Milestones Grid */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm">Milestone Deliverables & Payment Tracking</h3>
                  {!pilot.milestones || pilot.milestones.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No milestones defined yet by the officer.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pilot.milestones.map((ms: any) => (
                        <div key={ms.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold text-[#19322b] font-mono">MILESTONE {ms.sequence_order}</span>
                              <h4 className="font-bold text-slate-900 text-sm">{ms.title}</h4>
                            </div>
                            <span className={`status-pill ${ms.status === "paid" ? "status-published" : ms.status === "approved" ? "status-active" : "status-pending"}`}>
                              {ms.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 font-normal">{ms.description || "No description provided."}</p>

                          <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 font-mono">
                            <span className="text-slate-600">Payment Amount:</span>
                            <span className="font-bold text-emerald-800">₹{Number(ms.payment_amount).toLocaleString()}</span>
                          </div>

                          {/* Actions */}
                          {ms.status === "pending" && (
                            <button
                              onClick={() => setEvidenceMsId(ms.id)}
                              className="w-full mt-2 gov-btn-secondary text-xs py-2"
                            >
                              <Upload className="w-3.5 h-3.5" /> Submit Evidence Document
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Evidence Submission Modal */}
      {evidenceMsId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 font-serif">Submit Milestone Evidence Document</h3>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Document UUID</label>
              <input
                type="text"
                value={evidenceDocId}
                onChange={(e) => setEvidenceDocId(e.target.value)}
                placeholder="Paste uploaded document UUID..."
                className="gov-input font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEvidenceMsId(null)} className="gov-btn-secondary text-xs">Cancel</button>
              <button onClick={handleSubmitEvidence} className="gov-btn-primary text-xs">Submit Evidence</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
