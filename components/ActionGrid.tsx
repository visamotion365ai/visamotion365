"use client";

import {
  CalendarClock,
  Compass,
  FileCheck2,
  Globe,
  ScrollText,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { QUICK_ACTIONS, type QuickAction } from "@/lib/agents";

const ICONS: Record<QuickAction["icon"], LucideIcon> = {
  Compass,
  FileCheck2,
  ScrollText,
  ShieldAlert,
  CalendarClock,
  Globe,
};

interface ActionGridProps {
  onSelect: (action: QuickAction) => void;
}

/** Six quick-action cards shown on the empty hero state. */
export default function ActionGrid({ onSelect }: ActionGridProps) {
  return (
    <div className="mx-auto mt-8 grid w-full max-w-[720px] grid-cols-1 gap-3 sm:grid-cols-2">
      {QUICK_ACTIONS.map((action) => {
        const Icon = ICONS[action.icon];
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onSelect(action)}
            className="group cursor-pointer rounded-2xl border border-neutral-200/70 bg-white/50 p-4 text-left shadow-[0_6px_24px_rgba(15,32,24,0.05)] backdrop-blur-xl transition-all hover:border-neutral-300 hover:bg-white/75 hover:shadow-lg"
          >
            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200/70 bg-white/70 text-neutral-700 backdrop-blur transition-colors group-hover:bg-neutral-900 group-hover:text-white">
              <Icon size={17} strokeWidth={1.8} />
            </span>
            <span className="block text-sm font-medium text-neutral-900">
              {action.title}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">
              {action.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
