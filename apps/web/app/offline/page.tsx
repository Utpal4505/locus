"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { WifiOff, RefreshCw, Tv, ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/button";

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 selection:bg-accent selection:text-accent-foreground">
      <div className="w-full max-w-md bg-card border-2 border-border shadow-brutal rounded-md p-8 text-center space-y-6">
        {/* App Logo & Offline Icon Badge */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="relative">
            <Image
              src="/logo.svg"
              alt="Locus Logo"
              width={56}
              height={56}
              className="drop-shadow-sm"
              priority
            />
            <div className="absolute -bottom-2 -right-2 bg-destructive text-destructive-foreground p-1.5 rounded-full border-2 border-border shadow-brutal-sm">
              <WifiOff className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-muted-foreground">
            Locus Offline
          </span>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            You're Currently Offline
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Locus requires an active internet connection to synchronize subscriptions and stream YouTube content.
          </p>
        </div>

        {/* Status Callout */}
        <div className="p-3 bg-secondary/50 rounded-sm border border-border text-xs text-muted-foreground font-mono">
          Cached shell assets and local preferences remain safely preserved on your device.
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex-1 bg-primary text-primary-foreground font-bold border-2 border-border shadow-brutal hover:shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRetrying ? "animate-spin" : ""}`}
            />
            {isRetrying ? "Checking..." : "Retry Connection"}
          </Button>

          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full border-2 border-border shadow-brutal hover:shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] transition-all font-semibold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Feed
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

