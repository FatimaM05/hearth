"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "hearth_pwa_dismissed";

export default function PwaSetup() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platformHint, setPlatformHint] = useState<"ios" | "android" | "http" | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // Ignore registration failures in unsupported contexts
      });
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) return;

    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // Ignore storage errors
    }

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isSecure = window.isSecureContext;

    const frame = requestAnimationFrame(() => {
      setDismissed(false);
      if (!isSecure && (isIos || isAndroid)) {
        setPlatformHint("http");
      } else if (isIos) {
        setPlatformHint("ios");
      } else if (isAndroid) {
        setPlatformHint("android");
      }
    });

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    const onInstalled = () => {
      setDeferred(null);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (dismissed || (!deferred && !platformHint)) return null;

  function close() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage errors
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setDeferred(null);
      setDismissed(true);
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl bg-obsidian px-3.5 py-2.5 text-xs text-mist shadow-lg ring-1 ring-fog/30 md:bottom-4">
      {deferred ? (
        <button
          type="button"
          onClick={install}
          className="min-h-9 cursor-pointer rounded-xl bg-glow px-3 font-bold text-obsidian transition hover:bg-glow-deep"
        >
          Install Hearth app
        </button>
      ) : platformHint === "ios" ? (
        <span className="leading-snug">
          Install Hearth: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
        </span>
      ) : platformHint === "http" ? (
        <span className="leading-snug">
          Open your live <strong>https://</strong> Vercel URL on your phone to install Hearth as an app
        </span>
      ) : (
        <span className="leading-snug">
          Install Hearth: browser menu <strong>⋮</strong> → <strong>Add to Home screen</strong>
        </span>
      )}
      <button
        type="button"
        aria-label="Dismiss install prompt"
        onClick={close}
        className="min-h-9 shrink-0 cursor-pointer rounded-lg px-2 text-mist/70 hover:bg-white/10 hover:text-mist"
      >
        ✕
      </button>
    </div>
  );
}
