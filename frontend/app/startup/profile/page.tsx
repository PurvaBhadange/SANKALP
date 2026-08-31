"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, Save, Upload, CheckCircle2, AlertCircle, 
  Loader2, LogOut, Sparkles, FileText, Globe, Users, TrendingUp 
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { fetchWithAuth } from "@/lib/api";

interface Startup {
  id: string;
  name: string;
  registration_number: string;
  dpiit_recognition_number: string | null;
  incorporation_date: string | null;
  description: string;
  website: string | null;
  team_size: number | null;
  funding_stage: string | null;
  profile_complete: boolean;
  sector?: { name: string };
}

export default function StartupProfile() {
  const [startup, setStartup] = useState<Startup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [dpiitNumber, setDpiitNumber] = useState("");
  const [incorporationDate, setIncorporationDate] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [fundingStage, setFundingStage] = useState("Seed");

  // KYC Upload Fields
  const [docType, setDocType] = useState("incorporation_certificate");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);

  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const res = await fetchWithAuth("/startups/me");
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        throw new Error("Could not load startup profile.");
      }

      const data = await res.json();
      setStartup(data);

      setName(data.name || "");
      setDpiitNumber(data.dpiit_recognition_number || "");
      setIncorporationDate(data.incorporation_date || "");
      setDescription(data.description || "");
      setWebsite(data.website || "");
      setTeamSize(data.team_size ? String(data.team_size) : "");
      setFundingStage(data.funding_stage || "Seed");
    } catch (err: any) {
      setError(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [router]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const payload = {
        name,
        dpiit_recognition_number: dpiitNumber || null,
        incorporation_date: incorporationDate || null,
        description,
        website: website || null,
        team_size: teamSize ? parseInt(teamSize) : null,
        funding_stage: fundingStage
      };

      const res = await fetchWithAuth("/startups/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to update profile.");
      }

      const updated = await res.json();
      setStartup(updated);
      setSuccessMsg("Profile saved & AI embeddings updated successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setError(null);
    setDocSuccess(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("doc_type", docType);
      formData.append("file", selectedFile);

      const res = await fetchWithAuth("/startups/me/documents", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Document upload failed.");
      }

      setDocSuccess(`Document (${docType.replace("_", " ")}) uploaded successfully!`);
      setSelectedFile(null);
      setTimeout(() => setDocSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Status Header */}
        <div className="gov-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-white">{startup?.name}</h1>
              {startup?.profile_complete ? (
                <span className="status-pill status-active">
                  <CheckCircle2 className="w-3.5 h-3.5" /> AI Embedding Active
                </span>
              ) : (
                <span className="status-pill status-pending">
                  <AlertCircle className="w-3.5 h-3.5" /> Complete Details Needed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Registration Number: <span className="font-mono text-slate-300 font-bold">{startup?.registration_number}</span> | Sector: <span className="text-indigo-400 font-bold">{startup?.sector?.name || "General"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/startup/matches"
              className="gov-btn-primary text-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Matching Challenges</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        {/* Profile Edit Form */}
        <div className="gov-card rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Company Details & AI Solution Vectorization
          </h2>

          <form onSubmit={handleProfileSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Startup Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="gov-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  DPIIT Recognition Number
                </label>
                <input
                  type="text"
                  value={dpiitNumber}
                  onChange={(e) => setDpiitNumber(e.target.value)}
                  placeholder="DPIIT123456"
                  className="gov-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Website URL
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://mycompany.com"
                  className="gov-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Incorporation Date
                </label>
                <input
                  type="date"
                  value={incorporationDate}
                  onChange={(e) => setIncorporationDate(e.target.value)}
                  className="gov-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Team Size
                </label>
                <input
                  type="number"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  placeholder="e.g. 15"
                  className="gov-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Funding Stage
                </label>
                <select
                  value={fundingStage}
                  onChange={(e) => setFundingStage(e.target.value)}
                  className="gov-input bg-slate-900"
                >
                  <option value="Bootstrapped">Bootstrapped</option>
                  <option value="Grant Funded">Grant Funded</option>
                  <option value="Seed">Seed</option>
                  <option value="Pre-Series A">Pre-Series A</option>
                  <option value="Series A+">Series A+</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Product Capabilities Summary (Vectorized at 768 dimensions by Gemini)
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="gov-input leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="gov-btn-primary"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Profile & Update AI Vector</span>
              </button>
            </div>
          </form>
        </div>

        {/* KYC Document Upload */}
        <div className="gov-card rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            KYC & Verification Documents
          </h2>

          {docSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs">
              {docSuccess}
            </div>
          )}

          <form onSubmit={handleDocumentUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="gov-input bg-slate-900"
              >
                <option value="incorporation_certificate">Certificate of Incorporation</option>
                <option value="dpiit_certificate">DPIIT Recognition Certificate</option>
                <option value="pan_card">Company PAN Card</option>
                <option value="pitch_deck">Pitch Deck / Solution PDF</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Select File
              </label>
              <input
                type="file"
                required
                onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                className="gov-input file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-slate-800 file:text-xs file:text-indigo-400"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="gov-btn-secondary w-full"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>Upload KYC File</span>
              </button>
            </div>
          </form>
        </div>

      </main>
    </div>
  );
}
