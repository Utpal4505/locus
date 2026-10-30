"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import { AppShell } from "../components/app-shell";
import { FeedView } from "../components/feed-view";
import { FeedSkeleton } from "../components/feed/feed-skeleton";
import { AuthCard } from "../components/auth-card";
import {
  useUserPreferencesQuery,
  useChannelListQuery,
  useYoutubeStatusQuery,
} from "../lib/queries";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // Queries for onboarding evaluation
  const { data: preferences, isLoading: prefsLoading } = useUserPreferencesQuery({
    enabled: !!session,
  });
  const { data: channelData, isLoading: channelsLoading } = useChannelListQuery({
    enabled: !!session,
  });
  const { isLoading: statusLoading } = useYoutubeStatusQuery({
    enabled: !!session,
  });

  const [isCheckingOnboarding, setIsCheckingOnboarding] = React.useState(true);

  React.useEffect(() => {
    // Only evaluate once session and initial queries have finished loading
    if (!session || sessionLoading || prefsLoading || channelsLoading || statusLoading) {
      return;
    }

    const userId = session.user.id;
    const hasLocalCompleted =
      typeof window !== "undefined" &&
      localStorage.getItem(`locus_onboarded_${userId}`) === "true";
    const hasDbCompleted = !!preferences?.onboardingCompletedAt;
    const followedChannels = channelData?.channels.filter((c) => c.isFollowed) ?? [];
    const hasFollowedChannels = followedChannels.length > 0;

    // A user is onboarded if:
    // 1. They have finished onboarding in database, OR
    // 2. They have completed onboarding in localStorage, OR
    // 3. They already have followed channels feeding their library
    const isOnboarded = hasDbCompleted || hasLocalCompleted || hasFollowedChannels;

    if (!isOnboarded) {
      router.replace("/onboarding");
    } else {
      setIsCheckingOnboarding(false);
    }
  }, [
    session,
    sessionLoading,
    prefsLoading,
    channelsLoading,
    statusLoading,
    preferences,
    channelData,
    router,
  ]);

  return (
    <AppShell>
      {sessionLoading ? (
        <FeedSkeleton />
      ) : session ? (
        isCheckingOnboarding ? (
          <FeedSkeleton />
        ) : (
          /* Authenticated & Onboarded: Render Main Chronological Feed */
          <FeedView />
        )
      ) : (
        /* Unauthenticated: Modern Centered Authentication Station */
        <div className="py-8 sm:py-16 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-140px)]">
          <AuthCard />
        </div>
      )}
    </AppShell>
  );
}
