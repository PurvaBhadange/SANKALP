"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { 
  Building2, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, 
  Layers, Plus, Minus, Cpu, Award, Zap, Bot, 
  Lock, TrendingUp, HelpCircle, X, Sprout, Car, Droplets, Stethoscope,
  Users, Globe, CheckCircle
} from "lucide-react";

export default function HomePage() {
  // -------------------------------------------------------------------
  // FAQ Accordion State (Single Open Item)
  // -------------------------------------------------------------------
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // -------------------------------------------------------------------
  // Ask SANKALP AI Chatbot Widget Floating Modal State
  // -------------------------------------------------------------------
  const [aiWidgetOpen, setAiWidgetOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [aiResponses, setAiResponses] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Namaste! I am SANKALP AI (Powered by Gemini). How can I assist you with public sector challenges, startup registration, or pilot procurement today?" }
  ]);

  const handleAskAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    const q = userQuery.trim();
    setUserQuery("");
    setAiResponses((prev) => [...prev, { sender: "user", text: q }]);

    setTimeout(() => {
      let reply = "SANKALP enables Indian startups to solve government challenge statements, deploy pilot projects, and earn direct scale-up commercial orders.";
      if (q.toLowerCase().includes("eligib") || q.toLowerCase().includes("rule")) {
        reply = "Our automated eligibility engine evaluates DPIIT registration, minimum turnover, and sector match. Officers can waive non-critical criteria with documented justification.";
      } else if (q.toLowerCase().includes("pilot") || q.toLowerCase().includes("pay")) {
        reply = "Pilot projects undergo milestone tracking. Startup submits evidence, Department Officer verifies, and Procurement Officer approves Maker-Checker milestone disbursements.";
      } else if (q.toLowerCase().includes("approve") || q.toLowerCase().includes("scale")) {
        reply = "Scale-up approvals enforce a strict Maker-Checker rule: the approving Super Admin must be a different authorized user than the one who proposed the scale-up.";
      }
      setAiResponses((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 600);
  };

  // -------------------------------------------------------------------
  // FAQ Data List
  // -------------------------------------------------------------------
  const faqList = [
    {
      question: "Who is eligible to submit proposals for government innovation challenges on SANKALP?",
      answer: "DPIIT-recognized Indian startups, MSMEs, university incubators, and innovation labs registered in India can submit proposals. Each challenge defines specific eligibility criteria (e.g. minimum turnover, sector focus, team size), which are automatically evaluated by SANKALP's eligibility engine."
    },
    {
      question: "How does the automated eligibility evaluation engine and criteria waiving work?",
      answer: "Upon proposal submission, SANKALP automatically checks startup credentials against posted criteria. If a startup falls slightly short on non-core requirements (e.g. 2 years vs 3 years existence), Department Officers can grant documented waivers with audit reasons to ensure high-potential innovations are not prematurely disqualified."
    },
    {
      question: "What is the Pilot Project deployment process and how are financial milestone payments released?",
      answer: "Shortlisted proposals enter a structured pilot phase. An AI-drafted contract defines IP rights, data governance, and milestone deliverables. Startups upload proof of milestone completion, which undergoes Maker-Checker verification by Department and Procurement Officers before automated milestone disbursement."
    },
    {
      question: "How does the Maker-Checker Security Guard prevent bias during scale-up procurement approvals?",
      answer: "To ensure absolute governance integrity, SANKALP enforces dual authorization: a scale-up procurement proposal submitted by an officer or admin CANNOT be approved by the same user. Approval requires secondary validation by a distinct Super Admin."
    },
    {
      question: "Who retains Intellectual Property (IP) rights developed during the pilot deployment?",
      answer: "Startups retain complete ownership of their core background algorithms and underlying IP. The government department holds non-exclusive usage licenses and foreground deployment rights for public utility implementation."
    }
  ];

  // -------------------------------------------------------------------
  // Sector Outlets Showcase
  // -------------------------------------------------------------------
  const domainCategories = [
    {
      title: "AgriTech & Smart Farming Hub",
      subtitle: "IoT Soil Health Sensors, Satellite Telemetry & Precision Crop Diagnostics",
      icon: Sprout,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      tag: "1,240+ STARTUPS",
      metrics: "₹480 Cr Authorized Orders"
    },
    {
      title: "Smart Cities & Mobility Hub",
      subtitle: "AI Traffic Signals, Emergency Green Corridors & EV Infrastructure",
      icon: Car,
      color: "bg-blue-50 text-blue-800 border-blue-200",
      tag: "2,850+ STARTUPS",
      metrics: "₹620 Cr Authorized Orders"
    },
    {
      title: "CleanTech & Water Hub",
      subtitle: "Pipeline Contamination Probes, Solar Arrays & Waste Management",
      icon: Droplets,
      color: "bg-cyan-50 text-cyan-800 border-cyan-200",
      tag: "940+ STARTUPS",
      metrics: "₹390 Cr Authorized Orders"
    },
    {
      title: "HealthTech & Medical AI Hub",
      subtitle: "Remote Telemedicine Devices, Diagnostic AI & Oxygen Flow Monitors",
      icon: Stethoscope,
      color: "bg-[#fef2f2] text-[#991b1b] border-[#fca5a5]",
      tag: "1,520+ STARTUPS",
      metrics: "₹538 Cr Authorized Orders"
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-slate-900 font-sans selection:bg-[var(--brand-accent)] selection:text-white transition-colors duration-300">
      
      {/* 1. Global Navigation Bar */}
      <Navbar />

      {/* 2. Announcement Ticker Banner */}
      <div className="bg-[#FFD93D] text-black py-2.5 px-4 text-xs font-black uppercase border-b-4 border-black">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-[#FF6B6B] text-black px-2.5 py-0.5 border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#000]">
              FLASH ANNOUNCEMENT
            </span>
            <span className="hidden sm:inline font-bold">SIH 2026 OFFICIAL</span>
          </div>

          <div className="truncate text-center text-xs font-black tracking-wide">
            🏆 SANKALP Scale-Up Runway: Over <span className="bg-[#FF6B6B] text-black px-1 border border-black font-black">₹2,028+ Cr</span> in direct public procurement contracts authorized!
          </div>

          <Link href="/challenges" className="shrink-0 text-xs underline font-black flex items-center gap-1 hover:text-[#FF6B6B]">
            Browse Challenges ➔
          </Link>
        </div>
      </div>

      {/* 3. HERO SECTION (Neo-Brutalist Pop Canvas) */}
      <section className="relative bg-[#FFFDF5] text-black py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b-4 border-black overflow-hidden bg-halftone">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 border-3 border-black bg-[#C4B5FD] text-black text-xs font-black uppercase tracking-wider -rotate-1 shadow-[3px_3px_0px_0px_#000]">
              <Sparkles className="w-4 h-4 stroke-[3px]" />
              <span>INDIA'S PREMIER PUBLIC SECTOR INNOVATION MARKETPLACE</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-display leading-[0.95] text-black uppercase tracking-tighter">
              Connecting <span className="inline-block bg-[#FFD93D] text-black px-2 border-3 border-black shadow-[4px_4px_0px_0px_#000] -rotate-1">Startup Tech</span> with Public Sector Scale-Up Contracts
            </h1>

            <p className="text-black/90 text-base sm:text-lg leading-relaxed max-w-2xl font-bold">
              SANKALP empowers Indian government departments to post operational challenges, structure them with Gemini AI, verify DPIIT startup credentials, conduct blind cryptographic evaluations, deploy pilot projects, and issue direct scale-up orders.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/challenges"
                className="gov-btn-primary text-base"
              >
                <span>Browse Live Challenges</span>
                <ArrowRight className="w-5 h-5 stroke-[3px]" />
              </Link>
              <Link
                href="/register"
                className="gov-btn-secondary text-base"
              >
                <Building2 className="w-5 h-5 stroke-[3px]" />
                <span>Register Startup Profile</span>
              </Link>
            </div>

            {/* Trust Features Stickers */}
            <div className="pt-6 border-t-4 border-black grid grid-cols-3 gap-3 text-left text-xs font-black uppercase text-black">
              <div className="flex items-center gap-1.5 bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000]">
                <CheckCircle2 className="w-4 h-4 text-[#FF6B6B] stroke-[3px] shrink-0" />
                <span>DPIIT Check</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000]">
                <ShieldCheck className="w-4 h-4 text-[#FF6B6B] stroke-[3px] shrink-0" />
                <span>Maker-Checker</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000]">
                <Lock className="w-4 h-4 text-[#FF6B6B] stroke-[3px] shrink-0" />
                <span>SHA-256 Hash</span>
              </div>
            </div>
          </div>

          {/* Hero Right Real-Time Telemetry Card */}
          <div className="lg:col-span-5">
            <div className="bg-white text-black border-4 border-black p-6 sm:p-8 shadow-[12px_12px_0px_0px_#000] space-y-6">
              <div className="flex items-center justify-between border-b-4 border-black pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-[#FF6B6B] border-2 border-black animate-pulse"></div>
                  <span className="text-xs font-black text-black uppercase tracking-wider font-mono">LIVE PLATFORM TELEMETRY</span>
                </div>
                <span className="text-[10px] font-black font-mono bg-[#FFD93D] text-black px-2.5 py-1 border-2 border-black uppercase shadow-[2px_2px_0px_0px_#000]">
                  REAL-TIME API
                </span>
              </div>

              {/* Metrics Showcase */}
              <div className="space-y-4">
                <div className="p-5 bg-[#FFD93D] border-4 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-black text-black uppercase tracking-wider">Total Scale-Up Procurement Orders</span>
                    <span className="text-2xl sm:text-3xl font-black text-black font-mono">₹2,028,568,400</span>
                  </div>
                  <TrendingUp className="w-9 h-9 text-black stroke-[3px]" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-[#C4B5FD] border-3 border-black shadow-[3px_3px_0px_0px_#000]">
                    <span className="block text-[10px] font-black text-black uppercase">Active Pilot Projects</span>
                    <span className="text-lg font-black text-black font-mono">349 Projects</span>
                  </div>
                  <div className="p-4 bg-[#86EFAC] border-3 border-black shadow-[3px_3px_0px_0px_#000]">
                    <span className="block text-[10px] font-black text-black uppercase">DPIIT Startups</span>
                    <span className="text-lg font-black text-black font-mono">10,676 Entities</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-3 border-black shadow-[3px_3px_0px_0px_#000] text-black text-xs space-y-1.5">
                <p className="font-black uppercase flex items-center gap-1.5">
                  <Award className="w-4 h-4 stroke-[3px]" />
                  Direct Scale-Up Contract Authorization
                </p>
                <p className="text-xs text-black font-bold leading-relaxed">
                  Pilots reaching KPI performance benchmarks automatically trigger Executive Decision Briefs for commercial scale-up contracts.
                </p>
              </div>

              <Link
                href="/login"
                className="w-full py-3.5 bg-black text-white text-xs font-black uppercase tracking-wider border-3 border-black shadow-[4px_4px_0px_0px_#FFD93D] block text-center hover:bg-[#FF6B6B] hover:text-black transition-all"
              >
                Sign In to Department / Startup Portal ➔
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 4. IMPACT STAT COUNTER BANNER */}
      <section className="bg-[#FFD93D] text-black py-12 px-4 sm:px-6 lg:px-8 border-b-4 border-black">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-tight text-black">SANKALP Innovation Impact</h2>
            <p className="text-sm font-bold text-black uppercase">India's most transparent, audit-ready, and efficient public procurement ecosystem</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 border-4 border-black shadow-[6px_6px_0px_0px_#000] text-center space-y-2">
              <span className="text-4xl font-black font-mono text-black bg-[#FF6B6B] px-2 border-2 border-black inline-block">10,676+</span>
              <span className="block text-xs font-black uppercase tracking-wider text-black">DPIIT Startups</span>
              <p className="text-xs text-black font-bold">Registered across AgriTech, Mobility, CleanTech & Health</p>
            </div>

            <div className="bg-white p-6 border-4 border-black shadow-[6px_6px_0px_0px_#000] text-center space-y-2">
              <span className="text-4xl font-black font-mono text-black bg-[#86EFAC] px-2 border-2 border-black inline-block">₹2,028+ Cr</span>
              <span className="block text-xs font-black uppercase tracking-wider text-black">Scale-Up Order Value</span>
              <p className="text-xs text-black font-bold">Authorized across central ministries & state departments</p>
            </div>

            <div className="bg-white p-6 border-4 border-black shadow-[6px_6px_0px_0px_#000] text-center space-y-2">
              <span className="text-4xl font-black font-mono text-black bg-[#C4B5FD] px-2 border-2 border-black inline-block">349</span>
              <span className="block text-xs font-black uppercase tracking-wider text-black">Active Pilot Projects</span>
              <p className="text-xs text-black font-bold">Monitored via real-time milestone evidence & KPI logging</p>
            </div>

            <div className="bg-white p-6 border-4 border-black shadow-[6px_6px_0px_0px_#000] text-center space-y-2">
              <span className="text-4xl font-black font-mono text-black bg-[#FF6B6B] px-2 border-2 border-black inline-block">100%</span>
              <span className="block text-xs font-black uppercase tracking-wider text-black">Audit Hash Integrity</span>
              <p className="text-xs text-black font-bold">SHA-256 evaluation score hash chain & dual-authorization checks</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 4 PILLARS OF PUBLIC SECTOR INNOVATION */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-block border-3 border-black bg-[#C4B5FD] text-black px-3 py-1 font-black text-xs uppercase tracking-widest -rotate-2 shadow-[3px_3px_0px_0px_#000]">
            THE 4 PILLARS OF ECOSYSTEM SCALE-UP
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-display text-black uppercase tracking-tight">
            Closing the Lifecycle from Challenge to Scale-Up
          </h2>
          <p className="text-sm sm:text-base text-black font-bold leading-relaxed">
            Designed to eliminate bureaucratic friction and accelerate commercial technology adoption in government.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1.5 hover:shadow-[12px_12px_0px_0px_#000] transition-all space-y-4">
            <div className="w-12 h-12 bg-[#FF6B6B] border-3 border-black flex items-center justify-center font-black text-xl font-mono text-black shadow-[3px_3px_0px_0px_#000]">
              01
            </div>
            <h3 className="font-black text-lg uppercase text-black">AI Challenge Structuring</h3>
            <p className="text-xs text-black font-bold leading-relaxed">
              Department officers post raw operational problem statements. Gemini AI structures measurable outcomes, scope constraints, and target KPIs.
            </p>
          </div>

          <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1.5 hover:shadow-[12px_12px_0px_0px_#000] transition-all space-y-4">
            <div className="w-12 h-12 bg-[#FFD93D] border-3 border-black flex items-center justify-center font-black text-xl font-mono text-black shadow-[3px_3px_0px_0px_#000]">
              02
            </div>
            <h3 className="font-black text-lg uppercase text-black">Automated Screening</h3>
            <p className="text-xs text-black font-bold leading-relaxed">
              Startup proposals undergo instant rule verification against turnover and DPIIT credentials, with documented waiver workflows.
            </p>
          </div>

          <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1.5 hover:shadow-[12px_12px_0px_0px_#000] transition-all space-y-4">
            <div className="w-12 h-12 bg-[#C4B5FD] border-3 border-black flex items-center justify-center font-black text-xl font-mono text-black shadow-[3px_3px_0px_0px_#000]">
              03
            </div>
            <h3 className="font-black text-lg uppercase text-black">Cryptographic Panel Scoring</h3>
            <p className="text-xs text-black font-bold leading-relaxed">
              Blind evaluator scoring generates SHA-256 hash chains to guarantee tamper-proof ranking and selection for pilot trials.
            </p>
          </div>

          <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1.5 hover:shadow-[12px_12px_0px_0px_#000] transition-all space-y-4">
            <div className="w-12 h-12 bg-[#86EFAC] border-3 border-black flex items-center justify-center font-black text-xl font-mono text-black shadow-[3px_3px_0px_0px_#000]">
              04
            </div>
            <h3 className="font-black text-lg uppercase text-black">Maker-Checker Scale-Up</h3>
            <p className="text-xs text-black font-bold leading-relaxed">
              Completed pilots with verified KPI progress trigger Executive Briefs and dual-authorized commercial scale-up contracts.
            </p>
          </div>
        </div>
      </section>

      {/* 6. SECTOR HUBS SHOWCASE */}
      <section className="bg-slate-100/70 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-y border-slate-200">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-slate-300 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold theme-accent-text uppercase tracking-wider mb-1 font-mono">
                <Layers className="w-4 h-4" />
                <span>PUBLIC SECTOR INNOVATION HUBS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif">
                Featured Innovation Domains
              </h2>
            </div>
            <Link href="/challenges" className="text-xs font-bold theme-accent-text hover:underline flex items-center gap-1">
              Explore All Sector Challenges ➔
            </Link>
          </div>

          {/* Clean Domain Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {domainCategories.map((domain, idx) => {
              const IconComp = domain.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${domain.color}`}>
                        <IconComp className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {domain.tag}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {domain.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">
                        {domain.subtitle}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[11px] font-mono theme-accent-text font-bold">
                      {domain.metrics}
                    </div>
                  </div>

                  <Link
                    href="/challenges"
                    className="w-full py-2.5 bg-slate-100 hover:theme-header hover:text-white text-slate-800 text-xs font-semibold rounded-xl transition-all text-center block"
                  >
                    Explore Domain
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. MAHARASHTRA STARTUP WEEK FAQ ACCORDION */}
      <section id="faqs" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
        
        {/* Main Heading & Short Disclaimer Note */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
            <HelpCircle className="w-4 h-4 theme-accent-text" />
            <span>KNOWLEDGE BASE & GUIDANCE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif">
            Frequently Asked Questions (FAQs)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Disclaimer: Below are answers to commonly raised queries regarding challenge eligibility, pilot milestone disbursements, Maker-Checker authorization, and IP rights under the SANKALP Innovation Procurement Platform.
          </p>
        </div>

        {/* Vertical Accordion List */}
        <div className="space-y-3 pt-2">
          {faqList.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen 
                    ? "bg-white theme-accent-border shadow-sm" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Question Row Header */}
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base focus:outline-none"
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 font-mono font-bold ${
                      isOpen ? "theme-header text-white" : "bg-slate-100 text-slate-700"
                    }`}>
                      0{idx + 1}
                    </span>
                    <span>{faq.question}</span>
                  </span>

                  {/* Expand / Collapse Icon */}
                  <div className={`p-1.5 rounded-lg shrink-0 transition-transform ${
                    isOpen ? "theme-header text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>

                {/* Smooth Expandable Answer Body */}
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50">
                    <p className="whitespace-pre-line font-normal">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. FLOATING AI CHATBOT WIDGET ("Ask SANKALP AI") */}
      <div className="fixed bottom-6 left-6 z-50">
        {!aiWidgetOpen ? (
          <button
            type="button"
            onClick={() => setAiWidgetOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 theme-header text-white rounded-full shadow-xl hover:scale-105 transition-all font-bold text-xs border border-white/20"
          >
            <Bot className="w-5 h-5 theme-highlight-text" />
            <span>Ask SANKALP AI (Powered by Gemini)</span>
          </button>
        ) : (
          <div className="w-80 sm:w-96 bg-white border border-slate-300 rounded-3xl shadow-2xl text-slate-900 overflow-hidden flex flex-col h-[420px] animate-in slide-in-from-bottom duration-200">
            {/* Widget Header */}
            <div className="theme-header p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 theme-highlight-text" />
                <div>
                  <span className="font-bold text-xs text-white block">Ask SANKALP AI</span>
                  <span className="text-[9px] text-slate-200 font-medium">Powered by Gemini 3.6 Flash</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiWidgetOpen(false)}
                className="p-1 rounded-lg bg-black/20 text-slate-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat History Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-50">
              {aiResponses.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl leading-relaxed ${
                    msg.sender === "user"
                      ? "theme-accent-bg text-white ml-6 text-right font-medium"
                      : "bg-white text-slate-800 mr-6 border border-slate-200 shadow-sm font-normal"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Query Form */}
            <form onSubmit={handleAskAi} className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Ask about challenges, eligibility..."
                className="flex-1 bg-slate-100 text-slate-900 text-xs rounded-xl px-3 py-2 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[var(--brand-header)]"
              />
              <button type="submit" className="p-2 theme-header text-white rounded-xl">
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 9. Footer */}
      <footer className="theme-footer text-slate-200 text-xs border-t border-black/20 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 theme-highlight-text" />
              <span className="font-bold text-white text-lg font-serif">SANKALP</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed font-normal">
              Smart Innovation Procurement Platform for Indian Public Sector & Startups. Built for Smart India Hackathon 2026. Inspired by T-Hub & GeM.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase text-[11px] mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-[11px] text-slate-200">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              <li><Link href="/challenges" className="hover:text-white">Public Challenges</Link></li>
              <li><Link href="/register" className="hover:text-white">Register Startup</Link></li>
              <li><Link href="/#faqs" className="hover:text-white">Frequently Asked Questions</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase text-[11px] mb-3">Governance & Trust</h4>
            <ul className="space-y-2 text-[11px] text-slate-200">
              <li>DPIIT Startup Credentials</li>
              <li>Automated Eligibility Engine</li>
              <li>SHA-256 Score Hash Chain</li>
              <li>Maker-Checker Scale-Up Rule</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase text-[11px] mb-3">Support & Helpdesk</h4>
            <p className="text-[11px] text-slate-200 leading-relaxed mb-2 font-normal">
              Need assistance posting a challenge or submitting a pilot proposal?
            </p>
            <span className="font-mono theme-highlight-text font-bold block">support@sankalp2026.gov.in</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-white/10 text-center text-[10px] text-slate-400">
          © 2026 SANKALP Government Innovation Procurement Platform. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
