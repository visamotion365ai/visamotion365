"use client";
import React from "react";

// Renders inside an ActionForm: clicking it submits the parent form,
// which carries the already-inverted hidden value.
export function Toggle({ on }: { on: boolean }) {
  return (
    <button type="submit"
      className={`relative w-10 h-6 rounded-full transition ${on ? "bg-indigo-600" : "bg-slate-200"}`}
      aria-pressed={on} title={on ? "ON — click to turn off" : "OFF — click to turn on"}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}
