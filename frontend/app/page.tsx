"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { 
  Building2, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, 
  Layers, Plus, Minus, Cpu, Award, Zap, Bot, 
  Lock, TrendingUp, HelpCircle, X, Sprout, Car, Droplets, Stethoscope, FileText
} from "lucide-react";

export default function HomePage() {
  // -------------------------------------------------------------------
  // Maharashtra Startup Week FAQ Accordion State (Single Open Item)
  // -------------------------------------------------------------------
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // -------------------------------------------------------------------
  // Ask SANKALP AI Chatbot Widget Floating Modal State (GeMMy inspired)
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
  // FAQ Data List (Maharashtra Startup Week Inspired)
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
  // Clean, Sober, Natural Domain Showcase Categories
  // -------------------------------------------------------------------
  const domainCategories = [
    {
      title: "AgriTech & Irrigation",
      subtitle: "IoT Soil Health Sensors, Satellite Telemetry & Crop Diagnostics",
      icon: Sprout,
      color: "bg-[#e8f5e9] text-[#1b3b30] border-[#a5d6a7]",
      tag: "1,240+ STARTUPS"
    },
    {
      title: "Smart Cities & Mobility",
      subtitle: "AI Traffic Signals, Emergency Green Corridors & EV Infrastructure",
      icon: Car,
      color: "bg-[#fff3e0] text-[#c85a32] border-[#ffcc80]",
      tag: "2,850+ STARTUPS"
    },
    {
      title: "CleanTech & Water",
      subtitle: "Pipeline Contamination Probes, Solar Arrays & Waste Management",
      icon: Droplets,
      color: "bg-[#e0f2fe] text-[#0369a1] border-[#7dd3fc]",
      tag: "940+ STARTUPS"
    },
    {
      title: "HealthTech & Medical AI",
      subtitle: "Remote Diagnostics, Telemedicine Devices & Oxygen Monitors",
      icon: Stethoscope,
      color: "bg-[#fef2f2] text-[#991b1b] border-[#fca5a5]",
      tag: "1,520+ STARTUPS"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-[#c85a32] selection:text-white">
      
      {/* 1. Global Navigation Bar */}
      <Navbar />

      {/* 2. GeM Inspired Announcement Banner Ticker */}
      <div className="bg-[#1b3b30] text-white py-2 px-4 text-xs font-semibold shadow-inner border-b border-emerald-950">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-[#c85a32] text-white px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
              FLASH ANNOUNCEMENT
            </span>
            <span className="hidden sm:inline font-mono text-emerald-200">SIH 2026</span>
          </div>

          <div className="truncate text-center text-[11px] font-medium tracking-wide">
            🏆 SANKALP Innovation Runway: Over <span className="font-bold text-amber-300">₹2,028+ Cr</span> in direct public procurement scale-up orders authorized!
          </div>

          <Link href="/challenges" className="shrink-0 text-[11px] underline hover:text-amber-200 font-bold flex items-center gap-1">
            Browse Live Challenges ➔
          </Link>
        </div>
      </div>

      {/* 3. Hero Section (Sober & Natural Enterprise Government Theme) */}
      <section className="relative bg-[#ffffff] text-slate-900 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1b3b30]/10 border border-[#1b3b30]/20 text-[#1b3b30] text-xs font-bold tracking-wide">
              <Sparkles className="w-4 h-4 text-[#c85a32]" />
              <span>NATIONAL PUBLIC SECTOR INNOVATION MARKETPLACE</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold font-serif leading-tight text-slate-900 tracking-tight">
              Bridging Public Sector Challenges with <span className="text-[#c85a32]">Startup Innovation</span> & Scale-Up Procurement
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
              SANKALP empowers Indian government departments to define real-world operational challenge statements, structure them with Gemini AI, verify startup eligibility, conduct cryptographic panel evaluations, deploy pilot projects, and authorize direct scale-up orders.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/challenges"
                className="px-6 py-3.5 bg-[#c85a32] hover:bg-[#b34d28] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <span>Browse Live Challenges</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="px-6 py-3.5 bg-[#ffffff] hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                <Building2 className="w-4 h-4 text-[#1b3b30]" />
                <span>Register Startup Profile</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-center sm:text-left text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1b3b30] shrink-0" />
                <span>DPIIT Credential Checks</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1b3b30] shrink-0" />
                <span>Maker-Checker Governance</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#1b3b30] shrink-0" />
                <span>SHA-256 Hash Chain</span>
              </div>
            </div>
          </div>

          {/* Hero Right Enterprise Telemetry Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#ffffff] border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">PLATFORM TELEMETRY</span>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-700 font-bold border border-slate-200">
                  REAL-TIME API
                </span>
              </div>

              {/* Metrics Showcase */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-500 uppercase">Authorized Scale-Up Orders</span>
                    <span className="text-2xl font-bold text-[#1b3b30] font-mono">₹2,028,568,400</span>
                  </div>
                  <TrendingUp className="w-8 h-8 text-[#c85a32]" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Active Pilots</span>
                    <span className="text-lg font-bold text-slate-900 font-mono">349 Projects</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">DPIIT Startups</span>
                    <span className="text-lg font-bold text-slate-900 font-mono">10,676 Registered</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#c85a32]" />
                  Direct Commercial Scale-Up Authorization
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
                  Completed pilots meeting KPI progress targets automatically generate Executive Decision Briefs for statewide scaling.
                </p>
              </div>

              <Link
                href="/login"
                className="w-full py-3 bg-[#1b3b30] hover:bg-[#142d25] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all block text-center shadow-md"
              >
                Sign In to Department / Startup Portal ➔
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 4. GeM Inspired "Why Choose SANKALP" Stat Banner */}
      <section className="bg-[#1b3b30] text-white py-12 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold font-serif">Why Departments Choose SANKALP</h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 font-normal">India's most transparent, audit-ready, and secure public innovation procurement platform</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#142d25] p-6 rounded-2xl border border-emerald-800 text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-amber-300">10,676</span>
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-100">Innovation Categories</span>
              <p className="text-[11px] text-emerald-300/80 font-normal">AgriTech, Smart Cities, Health, Defence & Clean Energy</p>
            </div>

            <div className="bg-[#142d25] p-6 rounded-2xl border border-emerald-800 text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-amber-300">₹2,028+ Cr</span>
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-100">Scale-Up Order Value</span>
              <p className="text-[11px] text-emerald-300/80 font-normal">Authorized across state and central ministry pilot projects</p>
            </div>

            <div className="bg-[#142d25] p-6 rounded-2xl border border-emerald-800 text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-amber-300">349</span>
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-100">Active Pilot Deployments</span>
              <p className="text-[11px] text-emerald-300/80 font-normal">Real-time milestone tracking and verification</p>
            </div>

            <div className="bg-[#142d25] p-6 rounded-2xl border border-emerald-800 text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-amber-300">100%</span>
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-100">Cryptographic Integrity</span>
              <p className="text-[11px] text-emerald-300/80 font-normal">SHA-256 evaluation score hash chains & Maker-Checker checks</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Clean, Sober, Natural Domain Showcase Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c85a32] uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>KEY INNOVATION SECTORS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif">
              Popular Public Sector Domains
            </h2>
          </div>
          <Link href="/challenges" className="text-xs font-bold text-[#c85a32] hover:underline flex items-center gap-1">
            Browse All Challenges ➔
          </Link>
        </div>

        {/* Clean Natural Domain Cards */}
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
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
                </div>

                <Link
                  href="/challenges"
                  className="w-full py-2.5 bg-slate-100 hover:bg-[#1b3b30] hover:text-white text-slate-800 text-xs font-semibold rounded-xl transition-all text-center block"
                >
                  Explore Domain
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. T-Hub Inspired Innovation Pillars Section */}
      <section className="bg-[#f1f5f9] text-slate-900 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-y border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-[#c85a32] uppercase tracking-widest">
              END-TO-END INNOVATION LIFECYCLE
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
              The 4 Pillars of Government Procurement Scale-Up
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              Structured to close the lifecycle from problem identification to commercial adoption.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#1b3b30] text-white flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="font-bold text-base text-slate-900">AI Challenge Structuring</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Department officers post raw problem statements. Gemini AI structures measurable outcomes, scope, constraints, and target KPIs.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#1b3b30] text-white flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="font-bold text-base text-slate-900">Automated Screening</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Startup proposals undergo instant rule verification against turnover and DPIIT credentials, with documented waiver workflows.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#1b3b30] text-white flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="font-bold text-base text-slate-900">Cryptographic Panel Scoring</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Blind evaluator scoring generates SHA-256 hash chains to guarantee tamper-proof ranking and selection for pilot trials.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#1b3b30] text-white flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h3 className="font-bold text-base text-slate-900">Maker-Checker Scale-Up</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Completed pilots with verified KPI progress trigger Executive Briefs and dual-authorized commercial scale-up contracts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Maharashtra Startup Week Inspired Accordion FAQ Section */}
      <section id="faqs" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
        
        {/* Main Heading & Short Disclaimer Note */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[#1b3b30] text-xs font-bold">
            <HelpCircle className="w-4 h-4" />
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
                    ? "bg-white border-[#1b3b30] shadow-sm" 
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
                      isOpen ? "bg-[#1b3b30] text-white" : "bg-slate-100 text-slate-700"
                    }`}>
                      0{idx + 1}
                    </span>
                    <span>{faq.question}</span>
                  </span>

                  {/* Expand / Collapse Icon */}
                  <div className={`p-1.5 rounded-lg shrink-0 transition-transform ${
                    isOpen ? "bg-[#1b3b30] text-white" : "bg-slate-100 text-slate-600"
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

      {/* 8. GeM Inspired Floating AI Chatbot Assistant Widget ("Ask SANKALP AI") */}
      <div className="fixed bottom-6 left-6 z-50">
        {!aiWidgetOpen ? (
          <button
            type="button"
            onClick={() => setAiWidgetOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 bg-[#1b3b30] hover:bg-[#142d25] text-white rounded-full shadow-lg hover:scale-105 transition-all font-bold text-xs border border-emerald-800"
          >
            <Bot className="w-5 h-5 text-amber-300" />
            <span>Ask SANKALP AI (Powered by Gemini)</span>
          </button>
        ) : (
          <div className="w-80 sm:w-96 bg-white border border-slate-300 rounded-3xl shadow-2xl text-slate-900 overflow-hidden flex flex-col h-[420px] animate-in slide-in-from-bottom duration-200">
            {/* Widget Header */}
            <div className="bg-[#1b3b30] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-amber-300" />
                <div>
                  <span className="font-bold text-xs text-white block">Ask SANKALP AI</span>
                  <span className="text-[9px] text-emerald-200 font-medium">Powered by Gemini 3.6 Flash</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiWidgetOpen(false)}
                className="p-1 rounded-lg bg-[#142d25] text-emerald-200 hover:text-white"
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
                      ? "bg-[#c85a32] text-white ml-6 text-right font-medium"
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
                className="flex-1 bg-slate-100 text-slate-900 text-xs rounded-xl px-3 py-2 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1b3b30]"
              />
              <button type="submit" className="p-2 bg-[#1b3b30] hover:bg-[#142d25] text-white rounded-xl">
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 9. Footer */}
      <footer className="bg-[#142d25] text-emerald-200 text-xs border-t border-emerald-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-300" />
              <span className="font-bold text-white text-lg font-serif">SANKALP</span>
            </div>
            <p className="text-emerald-300/80 text-[11px] leading-relaxed font-normal">
              Smart Innovation Procurement Platform for Indian Public Sector & Startups. Built for Smart India Hackathon 2026.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase text-[11px] mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-[11px] text-emerald-200">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              <li><Link href="/challenges" className="hover:text-white">Public Challenges</Link></li>
              <li><Link href="/register" className="hover:text-white">Register Startup</Link></li>
              <li><Link href="/#faqs" className="hover:text-white">Frequently Asked Questions</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase text-[11px] mb-3">Governance & Trust</h4>
            <ul className="space-y-2 text-[11px] text-emerald-200">
              <li>DPIIT Startup Credentials</li>
              <li>Automated Eligibility Engine</li>
              <li>SHA-256 Score Hash Chain</li>
              <li>Maker-Checker Scale-Up Rule</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase text-[11px] mb-3">Support & Helpdesk</h4>
            <p className="text-[11px] text-emerald-200 leading-relaxed mb-2 font-normal">
              Need assistance posting a challenge or submitting a pilot proposal?
            </p>
            <span className="font-mono text-amber-300 font-bold block">support@sankalp2026.gov.in</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-emerald-900 text-center text-[10px] text-emerald-400">
          © 2026 SANKALP Government Innovation Procurement Platform. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
