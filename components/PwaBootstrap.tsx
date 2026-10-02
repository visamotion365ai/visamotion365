"use client";

import { useEffect } from "react";
import { initPwa } from "@/lib/pwa";

/** Registers the service worker and wires the install-prompt listener once. */
export default function PwaBootstrap() {
  useEffect(() => {
    initPwa();
    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }
  }, []);
  return null;
}
