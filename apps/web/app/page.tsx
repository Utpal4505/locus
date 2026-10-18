"use client";

import { authClient } from "../lib/auth-client";
import { Navbar } from "../components/navbar";
import { FeedView } from "../components/feed-view";
import { AuthDashboard } from "./auth-dashboard";

export default function Home() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  return (
    <div
      style={{ minHeight: "100vh", background: "#0a0a0a", color: "#ededed" }}
    >
      <Navbar />

      <main>
        {sessionLoading ? (
          <div
            style={{
              maxWidth: "1280px",
              margin: "64px auto",
              padding: "0 24px",
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: "14px",
            }}
          >
            Checking authentication session...
          </div>
        ) : session ? (
          /* Authenticated: Render Main Chronological Feed */
          <FeedView />
        ) : (
          /* Unauthenticated: Welcome & Auth View */
          <div
            style={{
              maxWidth: "720px",
              margin: "64px auto",
              padding: "0 24px",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "36px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "16px",
                  background: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  color: "#818cf8",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "16px",
                }}
              >
                <span>✦</span> Locus V1
              </div>
              <h1
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#fff",
                  lineHeight: 1.2,
                  marginBottom: "12px",
                }}
              >
                A Distraction-Free Chronological Feed
              </h1>
              <p
                style={{
                  fontSize: "16px",
                  color: "rgba(255, 255, 255, 0.65)",
                  lineHeight: 1.6,
                  maxWidth: "520px",
                  margin: "0 auto",
                }}
              >
                Take back control of your video consumption. Follow the channels
                you care about without algorithms, recommendations, or rabbit
                holes.
              </p>
            </div>

            <AuthDashboard />
          </div>
        )}
      </main>
    </div>
  );
}
