"use client";

import * as React from "react";
import Image from "next/image";
import { Download, X, Share, PlusSquare, WifiOff } from "lucide-react";
import { usePwaStore } from "../lib/stores/pwa.store";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

export function PwaInstallBanner() {
  const {
    isInstallable,
    isInstalled,
    isIos,
    isOnline,
    isBannerDismissed,
    triggerInstall,
    dismissBanner,
  } = usePwaStore();

  const [showIosInstructions, setShowIosInstructions] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    // Check if dismissed previously in localStorage
    try {
      if (localStorage.getItem("locus_pwa_banner_dismissed") === "true") {
        usePwaStore.setState({ isBannerDismissed: true });
      }
    } catch (e) {
      // Storage unavailable
    }
  }, []);

  if (!isClient) return null;

  // 1. Offline Toast Alert (displayed at top when network drops)
  const offlineAlert = !isOnline && (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] bg-destructive text-destructive-foreground border-2 border-border shadow-brutal px-4 py-2 rounded-sm flex items-center justify-between text-xs font-mono font-bold animate-in fade-in slide-in-from-top-2"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>Working offline. Cached content remains available.</span>
      </div>
    </div>
  );

  // 2. Install Banner (only show if not installed, not dismissed, and installable or on iOS)
  const shouldShowBanner =
    !isInstalled && !isBannerDismissed && (isInstallable || isIos);

  if (!shouldShowBanner) {
    return offlineAlert;
  }

  return (
    <>
      {offlineAlert}

      <aside
        aria-label="Install Locus App"
        className={cn(
          "fixed z-40 left-4 right-4 md:left-auto md:right-6 max-w-md bg-card border-2 border-border shadow-brutal rounded-md p-4 transition-all duration-300",
          "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] md:bottom-6",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-sm bg-background border-2 border-border flex items-center justify-center shrink-0 overflow-hidden shadow-brutal-sm">
            <Image
              src="/logo.svg"
              alt="Locus Logo"
              width={26}
              height={26}
              className="drop-shadow-xs"
            />
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <h4 className="text-sm font-bold text-foreground leading-tight">
              Install Locus App
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Add to your home screen for full-screen distraction-free video feeds.
            </p>

            {/* iOS Specific Instructions Accordion */}
            {isIos && showIosInstructions && (
              <div className="mt-3 p-2.5 bg-secondary/80 border border-border rounded-xs text-[11px] space-y-1.5 text-foreground font-mono">
                <div className="flex items-center gap-1.5">
                  <Share className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>1. Tap the <strong>Share</strong> icon in Safari</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PlusSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>2. Scroll down & choose <strong>Add to Home Screen</strong></span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              {isInstallable ? (
                <Button
                  size="sm"
                  onClick={() => triggerInstall()}
                  className="h-8 px-3 text-xs font-bold bg-primary text-primary-foreground border-2 border-border shadow-brutal-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Install App
                </Button>
              ) : isIos ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowIosInstructions((prev) => !prev)}
                  className="h-8 px-3 text-xs font-bold border-2 border-border shadow-brutal-sm"
                >
                  <Share className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  {showIosInstructions ? "Hide Steps" : "How to Install"}
                </Button>
              ) : null}

              <button
                type="button"
                onClick={dismissBanner}
                className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1"
              >
                Not now
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss banner"
            className="text-muted-foreground hover:text-foreground p-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}

