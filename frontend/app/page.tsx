"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Building2, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, 
  Layers, Plus, Minus, Cpu, Award, Zap, Bot, 
  Lock, TrendingUp, HelpCircle, X, Sprout, Car, Droplets, Stethoscope,
  Users, Globe, CheckCircle
} from "lucide-react";


export default function HomePage() {
  const { t } = useLanguage();

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
  // Sector Outlets Showcase with High Contrast Photography
  // -------------------------------------------------------------------
  const domainCategories = [
    {
      title: t("sector_agritech_title"),
      subtitle: t("sector_agritech_desc"),
      image: "/images/agritech.png",
      dateTag: "2026-ACTIVE",
      author: "BY MINISTRY OF AGRICULTURE & FARMERS WELFARE",
      metrics: "1,240+ STARTUPS REGISTERED"
    },
    {
      title: t("sector_mobility_title"),
      subtitle: t("sector_mobility_desc"),
      image: "/images/mobility.png",
      dateTag: "2026-ACTIVE",
      author: "BY MINISTRY OF ROAD TRANSPORT & HIGHWAYS",
      metrics: "2,850+ STARTUPS REGISTERED"
    },
    {
      title: t("sector_cleantech_title"),
      subtitle: t("sector_cleantech_desc"),
      image: "/images/cleantech.png",
      dateTag: "2026-ACTIVE",
      author: "BY MINISTRY OF JAL SHAKTI & NEW ENERGY",
      metrics: "940+ STARTUPS REGISTERED"
    },
    {
      title: t("sector_healthtech_title"),
      subtitle: t("sector_healthtech_desc"),
      image: "/images/healthtech.png",
      dateTag: "2026-ACTIVE",
      author: "BY MINISTRY OF HEALTH & FAMILY WELFARE",
      metrics: "1,520+ STARTUPS REGISTERED"
    }
  ];


  return (
    <div className="min-h-screen bg-[#FFFDF5] text-black font-sans selection:bg-[#FF6B6B] selection:text-black">
      
      {/* 1. Global Navigation Bar */}
      <Navbar />

      {/* 2. Announcement Ticker Banner */}
      <div className="bg-[#FFD93D] text-black py-2.5 px-4 text-xs font-black uppercase border-b-4 border-black">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-[#FF6B6B] text-black px-2.5 py-0.5 border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#000]">
              FLASH ANNOUNCEMENT
            </span>
            <span className="hidden sm:inline font-bold">GOVERNMENT INNOVATION</span>
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
              <span>{t("platform_tagline")}</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-display leading-[0.95] text-black uppercase tracking-tighter">
              {t("hero_title_1")} <span className="inline-block bg-[#FFD93D] text-black px-2 border-3 border-black shadow-[4px_4px_0px_0px_#000] -rotate-1">{t("hero_title_highlight")}</span>
            </h1>

            <p className="text-black/90 text-base sm:text-lg leading-relaxed max-w-2xl font-bold">
              {t("hero_desc")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/challenges"
                className="gov-btn-primary text-base"
              >
                <span>{t("btn_explore_challenges")}</span>
                <ArrowRight className="w-5 h-5 stroke-[3px]" />
              </Link>
              <Link
                href="/register"
                className="gov-btn-secondary text-base"
              >
                <Building2 className="w-5 h-5 stroke-[3px]" />
                <span>{t("btn_register")}</span>
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
                  <div className="p-4 bg-[#FFD93D] border-3 border-black shadow-[3px_3px_0px_0px_#000]">
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
              <span className="text-4xl font-black font-mono text-black bg-[#FFD93D] px-2 border-2 border-black inline-block">₹2,028+ Cr</span>
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

      {/* 5. SPLIT BLOCK: WHY TEAMS CHOOSE SANKALP (Solid Plain Pink Background without dots) */}
      <section className="border-b-4 border-black bg-black text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Block: Plain Solid Pink Container without dots */}
          <div className="lg:col-span-6 bg-[#FF6B6B] p-8 sm:p-14 border-b-4 lg:border-b-0 lg:border-r-4 border-black flex flex-col justify-between space-y-8">
            <div>
              <span className="inline-block bg-black text-[#FFD93D] font-mono font-black text-xs px-3 py-1 uppercase border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-6">
                HIGH-IMPACT GOVTECH MARKETPLACE
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white uppercase leading-[0.9] font-display tracking-tight drop-shadow-[4px_4px_0px_#000]">
                {t("why_section_heading")}
              </h2>
            </div>

            <div className="bg-white text-black border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000]">
              <h3 className="font-black text-lg uppercase tracking-tight mb-2">EVERYTHING YOU NEED TO SCALE GOV TECH INNOVATIONS IN ONE PLATFORM</h3>
              <p className="text-xs font-bold text-black/80 leading-relaxed">
                From raw operational challenge statements to AI-structured KPIs, cryptographic evaluator scoring, and automated pilot milestone disbursements.
              </p>
            </div>
          </div>

          {/* Right Block: Ivory Canvas with Solid Black Square Bullet Points */}
          <div className="lg:col-span-6 bg-[#FFFDF5] text-black p-8 sm:p-14 space-y-10 flex flex-col justify-center">
            
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 bg-black shrink-0 mt-1"></div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-black uppercase font-display tracking-tight">{t("why_feature_1_title")}</h3>
                <p className="text-xs text-black font-bold leading-relaxed">
                  {t("why_feature_1_desc")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-6 h-6 bg-black shrink-0 mt-1"></div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-black uppercase font-display tracking-tight">{t("why_feature_2_title")}</h3>
                <p className="text-xs text-black font-bold leading-relaxed">
                  {t("why_feature_2_desc")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-6 h-6 bg-black shrink-0 mt-1"></div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-black uppercase font-display tracking-tight">SCALE WITH NATIONAL CONFIDENCE</h3>
                <p className="text-xs text-black font-bold leading-relaxed">
                  Built to scale from state municipal pilots to multi-hundred crore central ministry procurement contracts seamlessly.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. FEATURED SECTOR CARDS WITH PHOTOGRAPHY (Reference Screenshot Style) */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b-4 border-black bg-[#FFFDF5]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b-4 border-black pb-6">
            <div>
              <span className="bg-[#C4B5FD] text-black text-xs font-black font-mono px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] uppercase inline-block mb-2">
                FEATURED STARTUP INNOVATIONS
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-black uppercase font-display tracking-tight">
                {t("sectors_heading")}
              </h2>
            </div>
            <Link
              href="/challenges"
              className="gov-btn-primary text-xs"
            >
              <span>{t("btn_explore_challenges")} ➔</span>
            </Link>
          </div>

          {/* Grid of Photo Cards matching Screenshot 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {domainCategories.map((domain, idx) => (
              <div
                key={idx}
                className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] hover:shadow-[14px_14px_0px_0px_#000] hover:-translate-y-1.5 transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Photo Container with Date Overlay Badge */}
                  <div className="relative h-52 w-full border-b-4 border-black overflow-hidden bg-black">
                    <img
                      src={domain.image}
                      alt={domain.title}
                      className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 group-hover:grayscale-0 transition-all duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-[#FF6B6B] text-black text-[11px] font-mono font-black border-2 border-black px-2.5 py-1 uppercase shadow-[2px_2px_0px_0px_#000]">
                      {domain.dateTag}
                    </span>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 space-y-4">
                    <h3 className="font-black text-black text-lg uppercase leading-tight font-display tracking-tight">
                      {domain.title}
                    </h3>
                    <p className="text-xs text-black font-bold leading-relaxed">
                      {domain.subtitle}
                    </p>

                    {/* Solid Black Horizontal Divider Line (Reference Screenshot style) */}
                    <div className="w-full h-1 bg-black"></div>

                    <div className="text-[10px] font-mono font-black text-black uppercase tracking-wider">
                      {domain.author}
                    </div>
                  </div>
                </div>

                {/* Card Footer CTA Button */}
                <div className="p-5 pt-0">
                  <Link
                    href="/challenges"
                    className="w-full py-3 bg-[#FFD93D] hover:bg-[#FF6B6B] text-black text-xs font-black uppercase tracking-wider border-3 border-black shadow-[3px_3px_0px_0px_#000] block text-center transition-all"
                  >
                    View Domain Challenges ➔
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. 4 PILLARS OF PUBLIC SECTOR INNOVATION */}
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
            <div className="w-12 h-12 bg-[#FFD93D] border-3 border-black flex items-center justify-center font-black text-xl font-mono text-black shadow-[3px_3px_0px_0px_#000]">
              04
            </div>
            <h3 className="font-black text-lg uppercase text-black">Maker-Checker Scale-Up</h3>
            <p className="text-xs text-black font-bold leading-relaxed">
              Completed pilots with verified KPI progress trigger Executive Briefs and dual-authorized commercial scale-up contracts.
            </p>
          </div>
        </div>
      </section>

      {/* 9. FLOATING AI CHATBOT WIDGET ("Ask SANKALP AI") */}
      <div className="fixed bottom-6 left-6 z-50">
        {!aiWidgetOpen ? (
          <button
            type="button"
            onClick={() => setAiWidgetOpen(true)}
            className="flex items-center gap-2.5 px-5 py-3.5 bg-black text-white rounded-none border-3 border-black shadow-[4px_4px_0px_0px_#FFD93D] hover:bg-[#FF6B6B] hover:text-black transition-all font-black text-xs uppercase"
          >
            <Bot className="w-5 h-5 text-[#FFD93D]" />
            <span>Ask SANKALP AI (Powered by Gemini)</span>
          </button>
        ) : (
          <div className="w-80 sm:w-96 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] text-black overflow-hidden flex flex-col h-[440px]">
            {/* Widget Header */}
            <div className="bg-black p-4 text-white flex items-center justify-between border-b-4 border-black">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#FFD93D]" />
                <div>
                  <span className="font-black text-xs text-white uppercase block">Ask SANKALP AI</span>
                  <span className="text-[9px] text-[#FFD93D] font-mono font-bold uppercase">Powered by Gemini Flash</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiWidgetOpen(false)}
                className="p-1 border border-white bg-white/20 text-white hover:bg-[#FF6B6B] hover:text-black transition-all"
              >
                <X className="w-4 h-4 stroke-[3px]" />
              </button>
            </div>

            {/* Chat History Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-[#FFFDF5]">
              {aiResponses.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 border-2 border-black font-bold leading-relaxed shadow-[2px_2px_0px_0px_#000] ${
                    msg.sender === "user"
                      ? "bg-[#FF6B6B] text-black ml-6 text-right"
                      : "bg-white text-black mr-6"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Query Form */}
            <form onSubmit={handleAskAi} className="p-3 bg-white border-t-4 border-black flex gap-2">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Ask about challenges, eligibility..."
                className="flex-1 bg-[#FFFDF5] text-black text-xs font-bold py-2 px-3 border-2 border-black focus:outline-none focus:bg-[#FFD93D]"
              />
              <button type="submit" className="p-2 bg-[#FF6B6B] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]">
                <ArrowRight className="w-4 h-4 stroke-[3px]" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 10. Footer */}
      <footer className="bg-black text-white text-xs border-t-4 border-black py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#FFD93D]" />
              <span className="font-black text-white text-xl font-display uppercase tracking-tight">SANKALP</span>
            </div>
            <p className="text-white/80 text-[11px] font-bold leading-relaxed">
              Smart Innovation Procurement Platform for Indian Public Sector & Startups. Inspired by T-Hub & GeM.
            </p>
          </div>

          <div>
            <h4 className="font-black text-[#FFD93D] uppercase text-xs mb-3 font-mono">Quick Navigation</h4>
            <ul className="space-y-2 text-[11px] font-bold text-white/90 uppercase">
              <li><Link href="/" className="hover:text-[#FF6B6B]">Home</Link></li>
              <li><Link href="/challenges" className="hover:text-[#FF6B6B]">Public Challenges</Link></li>
              <li><Link href="/register" className="hover:text-[#FF6B6B]">Register Startup</Link></li>
              <li><Link href="/faqs" className="hover:text-[#FF6B6B]">Frequently Asked Questions</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-[#FFD93D] uppercase text-xs mb-3 font-mono">Governance & Trust</h4>
            <ul className="space-y-2 text-[11px] font-bold text-white/90 uppercase">
              <li>DPIIT Startup Credentials</li>
              <li>Automated Eligibility Engine</li>
              <li>SHA-256 Score Hash Chain</li>
              <li>Maker-Checker Scale-Up Rule</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-[#FFD93D] uppercase text-xs mb-3 font-mono">Support & Helpdesk</h4>
            <p className="text-[11px] text-white/80 font-bold leading-relaxed mb-2">
              Need assistance posting a challenge or submitting a pilot proposal?
            </p>
            <span className="font-mono text-[#FFD93D] bg-white/10 px-2 py-1 border border-white/20 font-black inline-block">support@sankalp.gov.in</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t-2 border-white/20 text-center text-[10px] font-mono text-white/60 font-bold uppercase">
          © 2026 SANKALP Government Innovation Procurement Platform. All rights reserved.
        </div>
      </footer>

    </div>
  );
}

