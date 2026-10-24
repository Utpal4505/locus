"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { AuthCard } from "../../components/auth-card";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // Redirect to home feed if already authenticated
  React.useEffect(() => {
    if (session && !sessionLoading) {
      router.replace("/");
    }
  }, [session, sessionLoading, router]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-mono mt-3">
          Checking authentication session...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-surface-1 to-background flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Ambient Radial Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none select-none"></div>

      {/* Main Centered Auth Card */}
      <div className="w-full flex justify-center py-6 sm:py-12">
        <AuthCard />
      </div>

      {/* Subtle Desktop Minimal Footer Note */}
      <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-muted-foreground z-10 select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>100% Chronological • Distraction-free • Private notes</span>
      </div>
    </div>
  );
}

