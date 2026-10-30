import { AppShell } from "../components/app-shell";
import { FeedSkeleton } from "../components/feed/feed-skeleton";

export default function Loading() {
  return (
    <AppShell>
      <FeedSkeleton />
    </AppShell>
  );
}

