"use client";
import { useState } from "react";

interface Props {
  children: React.ReactNode;
  label?: string;
}

export function MobileFilterDrawer({ children, label = "סינון" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-300 bg-white text-sm font-medium text-gray-700 hover:bg-stone-50 transition-colors"
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
        {label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="mt-2 p-4 border border-stone-200 rounded-2xl bg-white shadow-sm">
          {children}
        </div>
      )}
    </div>
  );
}
