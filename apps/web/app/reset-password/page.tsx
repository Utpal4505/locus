"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { authClient } from "../../lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!token) {
      setErrorMsg("Reset token is missing or invalid. Please request a new reset link.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (res.error) {
        setErrorMsg(res.error.message ?? "Failed to reset password. The token may have expired.");
      } else {
        setSuccessMsg("Password reset successfully! Redirecting you to sign in...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto rounded-2xl bg-surface-1/95 border border-border shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10">
      {/* Brand & Header */}
      <div className="flex flex-col items-center text-center space-y-2 mb-6">
        <Image
          src="/logo.svg"
          alt="Locus Logo"
          width={40}
          height={40}
          className="w-10 h-10 object-contain select-none"
          priority
        />
        <span className="font-mono font-black text-lg tracking-tight text-foreground select-none">
          LOCUS
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight pt-1">
          Set New Password
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Enter your new password below to secure your account.
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground block">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
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

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground block">Confirm Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              className="w-full h-10 sm:h-11 px-3.5 pl-9 rounded-xl border border-border bg-surface-2/40 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
            />
            <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3 sm:top-3.5 pointer-events-none" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 sm:h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating password...</span>
            </>
          ) : (
            <>
              <span>Update Password</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-border/60 text-center text-xs text-muted-foreground">
        <Link href="/login" className="text-primary font-bold hover:underline select-none">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-surface-1 to-background flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none select-none"></div>
      <React.Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-mono mt-3">Loading...</span>
          </div>
        }
      >
        <ResetPasswordForm />
      </React.Suspense>
    </div>
  );
}

