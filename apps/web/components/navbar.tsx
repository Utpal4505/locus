"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "../lib/auth-client";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      window.location.href = "/";
    } catch {
      // Ignore
    }
  };

  return (
    <header
      style={{
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        background: "rgba(10, 10, 10, 0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 24px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 700,
              fontSize: "18px",
              letterSpacing: "-0.03em",
              color: "#fff",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#6366f1",
              }}
            />
            LOCUS
          </Link>

          {/* Navigation Links */}
          {session && (
            <nav style={{ display: "flex", gap: "6px" }}>
              <Link
                href="/"
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: pathname === "/" ? "#fff" : "rgba(255, 255, 255, 0.6)",
                  background:
                    pathname === "/"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "transparent",
                  transition: "all 0.15s ease",
                }}
              >
                Feed
              </Link>
              <Link
                href="/settings"
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color:
                    pathname === "/settings"
                      ? "#fff"
                      : "rgba(255, 255, 255, 0.6)",
                  background:
                    pathname === "/settings"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "transparent",
                  transition: "all 0.15s ease",
                }}
              >
                Channels & Settings
              </Link>
            </nav>
          )}
        </div>

        {/* User Status / Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {session ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  fontSize: "13px",
                  color: "rgba(255, 255, 255, 0.6)",
                  maxWidth: "180px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={session.user.email}
              >
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={handleSignOut}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "transparent",
                  color: "rgba(255, 255, 255, 0.8)",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/"
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                background: "#fff",
                color: "#000",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
