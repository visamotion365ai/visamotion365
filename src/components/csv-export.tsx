"use client";
import React from "react";
import { Download } from "lucide-react";

export function CsvExportButton({ rows, filename }: { rows: (string | number)[][]; filename: string }) {
  function onClick() {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = filename;
    a.click();
  }
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold px-3.5 py-2.5 hover:bg-slate-50">
      <Download size={14} /> Export CSV
    </button>
  );
}
