"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { authClient } from "../lib/auth-client";
import { apiClient } from "../lib/api-client";
import { cn } from "../lib/utils";

export type AuthMode = "signin" | "signup" | "forgot";

interface AuthCardProps {
  initialMode?: AuthMode;
  className?: string;
  onSuccess?: () => void;
}

export function AuthCard({ initialMode = "signin", className, onSuccess }: AuthCardProps) {
  const router = useRouter();

  const [mode, setMode] = React.useState<AuthMode>(initialMode);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Available OAuth providers state
  const [providers, setProviders] = React.useState<{ google: boolean }>({ google: true });

  React.useEffect(() => {
    apiClient
      .get<{ emailPassword: boolean; google: boolean }>("/api/auth/providers")
      .then((data) => {
        if (data) {
          setProviders({ google: !!data.google });
        }
      })
      .catch(() => {
        // Fallback default
      });
  }, []);

  const clearFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleModeChange = (newMode: AuthMode) => {
    clearFeedback();
    setMode(newMode);
  };

  // Google OAuth Handler
  const handleGoogleSignIn = async () => {
    clearFeedback();
    setIsGoogleLoading(true);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const callbackURL = mode === "signup" ? `${origin}/onboarding` : origin;
      await authClient.signIn.social({
        provider: "google",
        callbackURL,
        errorCallbackURL: `${origin}/login?error=oauth_error`,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Google sign-in failed. Please verify Google OAuth credentials in backend settings."
      );
      setIsGoogleLoading(false);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setIsLoading(true);

    try {
      if (mode === "signin") {
        const res = await authClient.signIn.email({
          email: email.trim(),
          password,
        });

        if (res.error) {
          setErrorMsg(res.error.message ?? "Invalid email or password.");
        } else {
          setSuccessMsg("Signed in successfully!");
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.href = "/";
          }
        }
      } else if (mode === "signup") {
        if (!name.trim()) {
          setErrorMsg("Please enter your name.");
          setIsLoading(false);
          return;
        }

        if (password.length < 8) {
          setErrorMsg("Password must be at least 8 characters long.");
          setIsLoading(false);
          return;
        }

        const res = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
        });

        if (res.error) {
          setErrorMsg(res.error.message ?? "Failed to create account.");
        } else {
          setSuccessMsg("Account created successfully! Signing you in...");
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.href = "/onboarding";
          }
        }
      } else if (mode === "forgot") {
        const redirectTo = `${
          typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
        }/reset-password`;

        const res = await authClient.requestPasswordReset({
          email: email.trim(),
          redirectTo,
        });

        if (res.error) {
          setErrorMsg(res.error.message ?? "Failed to request password reset.");
        } else {
          setSuccessMsg(
            "If an account exists with this email, a password reset link has been dispatched."
          );
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full max-w-[420px] mx-auto rounded-2xl bg-surface-1/95 border border-border shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10 transition-all",
        className
      )}
    >
      {/* Brand Logo & Headline */}
      <div className="flex flex-col items-center text-center space-y-2 mb-6">
        <Image
          src="/logo.svg"
          alt="Locus Logo"
          width={40}
          height={40}
          className="w-10 h-10 object-contain select-none"
          priority
        />
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-lg tracking-tight text-foreground select-none">
            LOCUS
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight pt-1">
          {mode === "signin" && "Welcome to Locus"}
          {mode === "signup" && "Create your account"}
          {mode === "forgot" && "Reset your password"}
        </h1>

        <p className="text-xs text-muted-foreground font-mono max-w-xs">
          {mode === "signin" && "Distraction-free video feeds & smart notes."}
          {mode === "signup" && "Join Locus to curate your chronological video library."}
          {mode === "forgot" && "Enter your email and we'll send a recovery link."}
        </p>
      </div>

      {/* Feedback Alerts */}
      {errorMsg && (
        <div
          role="alert"
          className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1 font-medium">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5 leading-relaxed"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1 font-medium">{successMsg}</span>
        </div>
      )}

      {/* 1-Click Continue with Google Button (for Sign In & Sign Up) */}
      {mode !== "forgot" && (
        <>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full h-11 sm:h-12 px-4 rounded-xl border border-border bg-surface-2/60 hover:bg-surface-2 hover:border-border-strong text-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-sm cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>
              {isGoogleLoading
                ? "Connecting..."
                : mode === "signup"
                ? "Sign up with Google"
                : "Continue with Google"}
            </span>
          </button>

          {/* Clean "or email" divider */}
          <div className="relative flex items-center justify-center my-5">
            <div className="w-full border-t border-border"></div>
            <span className="absolute bg-surface-1 px-3 text-[10px] font-mono text-muted-foreground uppercase tracking-widest select-none">
              or email
            </span>
          </div>
        </>
      )}

      {/* Main Authentication Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name Input (Sign Up Mode only) */}
        {mode === "signup" && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">Full Name</label>
            <div className="relative">
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full h-10 sm:h-11 px-3.5 pl-9 rounded-xl border border-border bg-surface-2/40 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans"
              />
              <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3 sm:top-3.5 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Email Address Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground block">Email address</label>
          <div className="relative">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full h-10 sm:h-11 px-3.5 pl-9 rounded-xl border border-border bg-surface-2/40 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
            />
            <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3 sm:top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Password Input (Sign In and Sign Up Modes) */}
        {mode !== "forgot" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground block">Password</label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => handleModeChange("forgot")}
                  className="text-[11px] font-mono text-primary hover:underline cursor-pointer select-none"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 sm:h-11 px-3.5 pl-9 pr-9 rounded-xl border border-border bg-surface-2/40 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3 sm:top-3.5 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 sm:top-3.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full h-11 sm:h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : mode === "signin" ? (
            <>
              <span>Sign In to Locus</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : mode === "signup" ? (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Send Reset Link</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Legal Consent Notice */}
        {mode !== "forgot" && (
          <p className="text-[11px] font-mono text-muted-foreground text-center mt-3 leading-relaxed">
            By {mode === "signup" ? "creating an account" : "signing in"}, you agree to our{" "}
            <Link
              href="/terms"
              className="text-primary font-bold hover:underline focus-visible:outline-none"
            >
              Terms of Service
            </Link>{" "}
            and acknowledge our{" "}
            <Link
              href="/privacy"
              className="text-primary font-bold hover:underline focus-visible:outline-none"
            >
              Privacy Policy
            </Link>
            .
          </p>
        )}
      </form>

      {/* Mode Switcher Footer */}
      <div className="mt-6 pt-4 border-t border-border/60 text-center text-xs text-muted-foreground">
        {mode === "signin" && (
          <p>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => handleModeChange("signup")}
              className="text-primary font-bold hover:underline cursor-pointer select-none"
            >
              Create account
            </button>
          </p>
        )}

        {mode === "signup" && (
          <p>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => handleModeChange("signin")}
              className="text-primary font-bold hover:underline cursor-pointer select-none"
            >
              Sign in
            </button>
          </p>
        )}

        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => handleModeChange("signin")}
            className="inline-flex items-center gap-1.5 text-primary font-bold hover:underline cursor-pointer select-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        )}
      </div>
    </div>
  );
}

