"use client";

import { Sparkles, AlertCircle } from "lucide-react";

interface AIFallbackBannerProps {
  aiGenerated?: boolean | null;
  message?: string;
}

export function AIFallbackBanner({ aiGenerated, message }: AIFallbackBannerProps) {
  if (aiGenerated === undefined || aiGenerated === null) {
    return null;
  }

  if (aiGenerated === false) {
    return (
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center justify-between gap-2 my-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{message || "AI analysis unavailable — showing fallback content"}</span>
        </div>
        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono text-[10px] uppercase tracking-wider font-bold">Fallback</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-medium my-1">
      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
      <span>AI Analysis Active</span>
    </div>
  );
}
