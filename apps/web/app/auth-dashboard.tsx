"use client";

import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";

export function AuthDashboard() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "forgot">("signin");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // UI status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Protected backend test response
  const [backendUser, setBackendUser] = useState<unknown | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendLoading, setBackendLoading] = useState(false);

  // Available OAuth providers from backend
  const [providers, setProviders] = useState<{
    emailPassword: boolean;
    google: boolean;
    github: boolean;
  }>({ emailPassword: true, google: false, github: false });

  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

  useEffect(() => {
    fetch(`${backendUrl}/api/auth/providers`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setProviders(data);
        }
      })
      .catch(() => {
        // Backend might still be starting up
      });
  }, [backendUrl]);

  const clearFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const res = await authClient.signIn.email({
        email,
        password,
      });

      if (res.error) {
        setErrorMsg(res.error.message ?? "Invalid email or password");
      } else {
        setSuccessMsg("Signed in successfully!");
        setPassword("");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const res = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (res.error) {
        setErrorMsg(res.error.message ?? "Registration failed");
      } else {
        setSuccessMsg(
          "Registration successful! Please check your email for a verification link.",
        );
        setPassword("");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/reset-password`,
      });

      if (res.error) {
        setErrorMsg(res.error.message ?? "Failed to request password reset");
      } else {
        setSuccessMsg(
          "If an account with that email exists, password reset instructions have been sent.",
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: "google" | "github") => {
    clearFeedback();
    if (!providers[provider]) {
      setErrorMsg(
        `${provider.toUpperCase()} OAuth is not configured on the backend. Please configure ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in apps/api/.env`,
      );
      return;
    }

    try {
      await authClient.signIn.social({
        provider,
        callbackURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : `Failed to start ${provider} sign-in`);
    }
  };

  const handleSignOut = async () => {
    clearFeedback();
    setBackendUser(null);
    try {
      await authClient.signOut();
      setSuccessMsg("Signed out successfully.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to sign out");
    }
  };

  const testBackendMeEndpoint = async () => {
    setBackendLoading(true);
    setBackendError(null);
    setBackendUser(null);

    try {
      const res = await fetch(`${backendUrl}/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message ?? `HTTP ${res.status}: ${res.statusText}`,
        );
      }

      const data = await res.json();
      setBackendUser(data);
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBackendLoading(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid var(--gray-alpha-200, #333)",
        borderRadius: "12px",
        padding: "24px",
        background: "var(--gray-alpha-100, #181818)",
        maxWidth: "520px",
        width: "100%",
        margin: "24px 0",
        fontFamily: "inherit",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: 600 }}>
          Locus Authentication
        </h3>
        <p style={{ margin: 0, fontSize: "13px", opacity: 0.7 }}>
          Backend: <code>{backendUrl}</code>
        </p>
      </div>

      {sessionLoading ? (
        <p style={{ fontSize: "14px", opacity: 0.8 }}>Checking session status...</p>
      ) : session ? (
        /* Authenticated Session View */
        <div>
          <div
            style={{
              padding: "16px",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, color: "#10b981", fontSize: "14px" }}>
                ✓ Authenticated
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  background: session.user.emailVerified ? "#10b981" : "#f59e0b",
                  color: "#fff",
                }}
              >
                {session.user.emailVerified ? "Verified" : "Unverified Email"}
              </span>
            </div>
            <div style={{ marginTop: "12px", fontSize: "14px", lineHeight: "1.6" }}>
              <div>
                <strong>Name:</strong> {session.user.name ?? "None"}
              </div>
              <div>
                <strong>Email:</strong> {session.user.email}
              </div>
              <div>
                <strong>User ID:</strong> <code style={{ fontSize: "12px" }}>{session.user.id}</code>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <button
              onClick={handleSignOut}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #dc2626",
                background: "#dc2626",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Sign Out
            </button>
            <button
              onClick={testBackendMeEndpoint}
              disabled={backendLoading}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #4f46e5",
                background: "#4f46e5",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {backendLoading ? "Validating..." : "Test Protected /me Route"}
            </button>
          </div>

          {backendUser !== null && (
            <div
              style={{
                padding: "12px",
                borderRadius: "6px",
                background: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                fontSize: "13px",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "4px", color: "#818cf8" }}>
                Backend /me response:
              </div>
              <pre style={{ margin: 0, overflowX: "auto", fontSize: "12px" }}>
                {JSON.stringify(backendUser, null, 2)}
              </pre>
            </div>
          )}

          {backendError && (
            <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "8px" }}>
              Backend /me check failed: {backendError}
            </div>
          )}
        </div>
      ) : (
        /* Unauthenticated View: Sign In / Sign Up / Forgot Password */
        <div>
          {/* Navigation Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--gray-alpha-200, #333)",
              marginBottom: "16px",
            }}
          >
            <button
              onClick={() => {
                setActiveTab("signin");
                clearFeedback();
              }}
              style={{
                padding: "8px 14px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "signin" ? "2px solid #fff" : "2px solid transparent",
                color: activeTab === "signin" ? "#fff" : "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab("signup");
                clearFeedback();
              }}
              style={{
                padding: "8px 14px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "signup" ? "2px solid #fff" : "2px solid transparent",
                color: activeTab === "signup" ? "#fff" : "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Create Account
            </button>
            <button
              onClick={() => {
                setActiveTab("forgot");
                clearFeedback();
              }}
              style={{
                padding: "8px 14px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "forgot" ? "2px solid #fff" : "2px solid transparent",
                color: activeTab === "forgot" ? "#fff" : "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "14px",
              }}
            >
              Reset Password
            </button>
          </div>

          {/* Social Logins */}
          {activeTab !== "forgot" && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <button
                  type="button"
                  onClick={() => handleSocialSignIn("google")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    background: "#222",
                    color: "#fff",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span>Google</span>
                  {!providers.google && (
                    <span style={{ fontSize: "10px", opacity: 0.5 }}>(not configured)</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialSignIn("github")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    background: "#222",
                    color: "#fff",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span>GitHub</span>
                  {!providers.github && (
                    <span style={{ fontSize: "10px", opacity: 0.5 }}>(not configured)</span>
                  )}
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  margin: "12px 0",
                  opacity: 0.4,
                  fontSize: "12px",
                }}
              >
                <div style={{ flex: 1, height: "1px", background: "currentColor" }} />
                <span style={{ padding: "0 8px" }}>or with email</span>
                <div style={{ flex: 1, height: "1px", background: "currentColor" }} />
              </div>
            </div>
          )}

          {/* Forms */}
          {activeTab === "signin" && (
            <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    background: "#222",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    background: "#222",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "6px",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#fff",
                  color: "#000",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          {activeTab === "signup" && (
            <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    background: "#222",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    background: "#222",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    background: "#222",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "6px",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#fff",
                  color: "#000",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Registering..." : "Create Account"}
              </button>
            </form>
          )}

          {activeTab === "forgot" && (
            <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "13px", opacity: 0.8 }}>
                Enter your account email to receive a password reset link via Nodemailer SMTP.
              </p>
              <div>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    background: "#222",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "6px",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#fff",
                  color: "#000",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Sending..." : "Send Password Reset Link"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Error & Success Feedback */}
      {errorMsg && (
        <div
          style={{
            marginTop: "16px",
            padding: "10px 14px",
            borderRadius: "6px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            fontSize: "13px",
          }}
        >
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            marginTop: "16px",
            padding: "10px 14px",
            borderRadius: "6px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#34d399",
            fontSize: "13px",
          }}
        >
          {successMsg}
        </div>
      )}
    </div>
  );
}
