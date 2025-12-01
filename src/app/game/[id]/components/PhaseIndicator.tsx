"use client";

import { Phase } from "@/lib/game/types/enums";
import { PHASE_NAMES } from "../utils/phase-names";

interface PhaseIndicatorProps {
  phase: Phase | null;
  turn: number;
}

export default function PhaseIndicator({ phase, turn }: PhaseIndicatorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200/50 transition-all duration-200 hover:shadow-sm">
        <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Turn</span>
        <span className="text-base sm:text-lg font-bold text-orange-600">{turn}</span>
      </div>
      {phase && (
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50 transition-all duration-200 hover:shadow-sm">
          <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Phase</span>
          <span className="text-base sm:text-lg font-semibold text-blue-600">
            {PHASE_NAMES[phase]}
          </span>
        </div>
      )}
      {!phase && (
        <div className="text-xs sm:text-sm text-slate-500 italic">Waiting for game to start...</div>
      )}
    </div>
  );
}

