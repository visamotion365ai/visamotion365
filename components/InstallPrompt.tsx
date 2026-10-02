"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { isIos, isStandalone, promptInstall, subscribeInstall } from "@/lib/pwa";

const DISMISS_KEY = "visamotion_install_dismissed";
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [available, setAvailable] = useState(false);
  const [guide, setGuide] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeInstall(setAvailable);
    const openGuide = () => {
      setShow(true);
      setGuide(true);
    };
    window.addEventListener("visamotion:open-install", openGuide);

    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    const recentlyDismissed = Date.now() - dismissedAt < DISMISS_MS;
    setIos(isIos());
    let timer = 0;
    if (!isStandalone() && !recentlyDismissed) {
      timer = window.setTimeout(() => setShow(true), 900);
    }
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("visamotion:open-install", openGuide);
      unsubscribe();
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      setShow(false);
      return;
    }
    if (outcome === "unavailable") setGuide(true);
  };

  return (
    <>
      <div className="vm-install fixed bottom-4 left-3 right-3 z-[55] sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:w-[340px]">
        <div className="flex items-center gap-3 rounded-[22px] border border-white/70 bg-white/80 p-3 shadow-[0_18px_50px_-16px_rgba(15,32,24,0.4)] backdrop-blur-2xl">
          <img
            src="/icons/icon-192.png"
            alt="VisaMotion 365"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-[12px] shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold tracking-tight text-neutral-900">
              Install VisaMotion 365
            </p>
            <p className="truncate text-[11px] text-neutral-500">
              {ios ? "Add to Home Screen from Safari" : "Full-screen, faster, works offline"}
            </p>
          </div>
          <button
            type="button"
            onClick={install}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-neutral-700"
          >
            <Download size={13} />
            Install
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {guide && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setGuide(false)}
            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm"
          />
          <div className="vm-drawer relative w-full max-w-[420px] rounded-[26px] p-6">
            <div className="flex items-center gap-3">
              <img
                src="/icons/icon-192.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-[14px] shadow"
              />
              <div>
                <h3 className="text-base font-semibold tracking-tight text-neutral-900">
                  Install the app
                </h3>
                <p className="text-xs text-neutral-500">No store, no APK — installs instantly</p>
              </div>
            </div>

            <ol className="mt-5 space-y-3 text-sm text-neutral-600">
              {ios ? (
                <>
                  <li className="flex gap-3">
                    <span className="vm-step">1</span>
                    <span>
                      Tap the <Share size={14} className="mx-0.5 inline" /> <b>Share</b> button in
                      Safari.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="vm-step">2</span>
                    <span>
                      Choose <b>Add to Home Screen</b>.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="vm-step">3</span>
                    <span>
                      Tap <b>Add</b> — the icon appears on your home screen.
                    </span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-3">
                    <span className="vm-step">1</span>
                    <span>
                      Open the browser menu (<Smartphone size={14} className="mx-0.5 inline" /> ⋮).
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="vm-step">2</span>
                    <span>
                      Tap <b>Install app</b> or <b>Add to Home screen</b>.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="vm-step">3</span>
                    <span>Confirm — it opens in its own window from now on.</span>
                  </li>
                </>
              )}
            </ol>

            <button
              type="button"
              onClick={() => setGuide(false)}
              className="mt-6 w-full rounded-full bg-neutral-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
