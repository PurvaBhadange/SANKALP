"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { 
  HelpCircle, Search, Plus, Minus, Mail, Phone, ShieldCheck, 
  FileText, Award, Building2, ArrowRight, MessageSquare
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface FaqItem {
  id: number;
  category: "ELIGIBILITY" | "PILOTS" | "GOVERNANCE" | "IP";
  question: string;
  answer: string;
}

export default function FaqsPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqList: FaqItem[] = [
    {
      id: 1,
      category: "ELIGIBILITY",
      question: "Who is eligible to submit proposals for government innovation challenges on SANKALP?",
      answer: "DPIIT-recognized Indian startups, MSMEs, university incubators, and innovation labs registered in India can submit proposals. Each challenge defines specific eligibility criteria (e.g. minimum turnover, sector focus, team size), which are automatically evaluated by SANKALP's eligibility engine."
    },
    {
      id: 2,
      category: "ELIGIBILITY",
      question: "How does the automated eligibility evaluation engine and criteria waiving work?",
      answer: "Upon proposal submission, SANKALP automatically checks startup credentials against posted criteria. If a startup falls slightly short on non-core requirements (e.g. 2 years vs 3 years existence), Department Officers can grant documented waivers with audit reasons to ensure high-potential innovations are not prematurely disqualified."
    },
    {
      id: 3,
      category: "PILOTS",
      question: "What is the Pilot Project deployment process and how are financial milestone payments released?",
      answer: "Shortlisted proposals enter a structured pilot phase. An AI-drafted contract defines IP rights, data governance, and milestone deliverables. Startups upload proof of milestone completion, which undergoes Maker-Checker verification by Department and Procurement Officers before automated milestone disbursement."
    },
    {
      id: 4,
      category: "GOVERNANCE",
      question: "How does the Maker-Checker Security Guard prevent bias during scale-up procurement approvals?",
      answer: "To ensure absolute governance integrity, SANKALP enforces dual authorization: a scale-up procurement proposal submitted by an officer or admin CANNOT be approved by the same user. Approval requires secondary validation by a distinct Super Admin."
    },
    {
      id: 5,
      category: "IP",
      question: "Who retains Intellectual Property (IP) rights developed during the pilot deployment?",
      answer: "Startups retain complete ownership of their core background algorithms and underlying IP. The government department holds non-exclusive usage licenses and foreground deployment rights for public utility implementation."
    },
    {
      id: 6,
      category: "PILOTS",
      question: "How are pilot performance benchmarks and KPIs measured?",
      answer: "Every pilot defines quantitative KPIs (e.g. 95% accuracy, 50ms response latency, or zero pipeline leakage). Field evidence and telemetry logs are logged to the platform and cryptographically sealed with SHA-256 score hash chains."
    },
    {
      id: 7,
      category: "GOVERNANCE",
      question: "What cryptographic security measures protect evaluator score cards?",
      answer: "All evaluator scores are anonymized and hashed using SHA-256. This prevents score tampering or post-evaluation modification, ensuring an audit-ready digital trail for government scrutiny."
    }
  ];

  const filteredFaqs = faqList.filter((item) => {
    const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryLabels: Record<string, string> = {
    ALL: t("faq_tab_all"),
    ELIGIBILITY: t("faq_tab_eligibility"),
    PILOTS: t("faq_tab_pilots"),
    GOVERNANCE: t("faq_tab_governance"),
    IP: t("faq_tab_ip")
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-black font-sans selection:bg-[#FF6B6B] selection:text-black flex flex-col justify-between">
      <div>
        <Navbar />

        {/* Page Banner Header */}
        <section className="bg-black text-white py-12 px-4 sm:px-6 lg:px-8 border-b-4 border-black font-mono">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="inline-block bg-[#FFD93D] text-black font-black text-xs px-3 py-1 uppercase border-2 border-black shadow-[2px_2px_0px_0px_#FFF]">
              OFFICIAL HELPDESK & KNOWLEDGE BASE
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase font-display tracking-tight">
              {t("faqs_title")}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 font-bold max-w-2xl mx-auto uppercase leading-relaxed">
              {t("faqs_subtitle")}
            </p>

            {/* Search Input Bar */}
            <div className="pt-4 max-w-xl mx-auto relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search_placeholder")}
                className="w-full bg-white text-black placeholder-gray-500 font-bold text-xs py-3 pl-4 pr-10 border-4 border-black shadow-[4px_4px_0px_0px_#FFD93D] focus:bg-[#FFFDF5] focus:outline-none"
              />
              <Search className="w-4 h-4 text-black absolute right-3 top-4 stroke-[3px]" />
            </div>
          </div>
        </section>

        {/* Category Filters */}
        <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs">
            {["ALL", "ELIGIBILITY", "PILOTS", "GOVERNANCE", "IP"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 border-3 border-black font-black uppercase transition-all ${
                  selectedCategory === cat
                    ? "bg-[#FF6B6B] text-black shadow-[3px_3px_0px_0px_#000]"
                    : "bg-white text-black hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_#000]"
                }`}
              >
                {categoryLabels[cat] || cat}
              </button>
            ))}
          </div>
        </section>

        {/* FAQ Accordion List */}
        <section className="pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="bg-white border-4 border-black p-8 text-center space-y-3 shadow-[6px_6px_0px_0px_#000]">
              <HelpCircle className="w-10 h-10 text-[#FF6B6B] mx-auto stroke-[3px]" />
              <h3 className="font-black text-lg text-black uppercase">No matching queries found</h3>
              <p className="text-xs text-black font-bold">Try searching with different keywords or submit a ticket directly to the helpdesk team below.</p>
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={faq.id}
                  className={`border-4 border-black transition-all overflow-hidden ${
                    isOpen 
                      ? "bg-white shadow-[6px_6px_0px_0px_#000]" 
                      : "bg-white shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-black text-black text-sm sm:text-base focus:outline-none uppercase"
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-8 h-8 border-2 border-black flex items-center justify-center text-xs shrink-0 font-mono font-black shadow-[2px_2px_0px_0px_#000] ${
                        isOpen ? "bg-[#FF6B6B] text-black" : "bg-[#FFD93D] text-black"
                      }`}>
                        0{idx + 1}
                      </span>
                      <span>{faq.question}</span>
                    </span>

                    <div className={`p-1.5 border-2 border-black shrink-0 transition-transform shadow-[2px_2px_0px_0px_#000] ${
                      isOpen ? "bg-[#FF6B6B] text-black" : "bg-[#FFD93D] text-black"
                    }`}>
                      {isOpen ? <Minus className="w-4 h-4 stroke-[3px]" /> : <Plus className="w-4 h-4 stroke-[3px]" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5 pt-3 text-xs sm:text-sm text-black font-bold leading-relaxed border-t-4 border-black bg-[#FFFDF5]">
                      <p className="whitespace-pre-line">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* Contact Support Section */}
        <section className="pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="bg-[#FFD93D] border-4 border-black p-8 shadow-[8px_8px_0px_0px_#000] text-black space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-6 h-6 stroke-[3px]" />
              <h2 className="text-2xl font-black uppercase font-display tracking-tight">{t("helpdesk_contact_title")}</h2>
            </div>
            <p className="text-xs font-bold uppercase leading-relaxed">
              {t("helpdesk_contact_desc")}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-xs font-black">
              <span className="bg-white px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                📧 support@sankalp.gov.in
              </span>
              <span className="bg-white px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                📞 1800-200-SANKALP (1800-200-7265)
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white text-xs border-t-4 border-black py-8 px-4 sm:px-6 lg:px-8 text-center font-mono">
        <p className="font-bold uppercase">SANKALP — Government Innovation Procurement Platform</p>
      </footer>
    </div>
  );
}
