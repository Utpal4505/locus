"use client";

import * as React from "react";
import { usePwaStore, type BeforeInstallPromptEvent } from "../lib/stores/pwa.store";

export function PwaRegister() {
  const {
    setDeferredPrompt,
    setIsInstalled,
    setIsIos,
    setIsOnline,
  } = usePwaStore();

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Detect Standalone / Installed Mode
    const isStandaloneDisplay = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const isIosStandalone =
      "standalone" in window.navigator &&
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandaloneDisplay || isIosStandalone) {
      setIsInstalled(true);
    }

    // 2. Detect iOS Device
    const userAgent = window.navigator.userAgent || "";
    const isIosDevice =
      /iPad|iPhone|iPod/.test(userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(isIosDevice);

    // 3. Listen for BeforeInstallPrompt Event (Android, Chromium)
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    // 4. Listen for App Installed Event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log("[PWA] Locus app successfully installed!");
    };

    // 5. Connectivity Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 6. Register Service Worker in production and localhost
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[SW] Registered with scope:", registration.scope);

          // Check for service worker updates periodically
          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener("statechange", () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[SW] New version available, will activate on reload.");
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn("[SW] Registration failed:", error);
        });
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setDeferredPrompt, setIsInstalled, setIsIos, setIsOnline]);

  return null;
}

