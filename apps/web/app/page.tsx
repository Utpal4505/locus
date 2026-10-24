"use client";

import { Loader2 } from "lucide-react";
import { authClient } from "../lib/auth-client";
import { AppShell } from "../components/app-shell";
import { FeedView } from "../components/feed-view";
import { AuthCard } from "../components/auth-card";

export default function Home() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  return (
    <AppShell>
      {sessionLoading ? (
        <div className="max-w-md mx-auto my-24 px-6 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-mono">
            Checking authentication session...
          </span>
        </div>
      ) : session ? (
        /* Authenticated: Render Main Chronological Feed */
        <FeedView />
      ) : (
        /* Unauthenticated: Modern Centered Authentication Station */
        <div className="py-8 sm:py-16 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-140px)]">
          <AuthCard />
        </div>
      )}
    </AppShell>
  );
}
