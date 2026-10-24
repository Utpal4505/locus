"use client";

import * as React from "react";
import {
  Bug,
  Sparkles,
  X,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Navigation,
  Terminal,
  ShieldCheck,
  Send,
  Loader2,
} from "lucide-react";
import { useFeedbackStore } from "../lib/stores/feedback.store";
import { collectDiagnostics, type TelemetryPayload } from "../lib/telemetry";
import { useCreateFeedbackMutation } from "../lib/queries/feedback";
import { authClient } from "../lib/auth-client";
import { cn } from "../lib/utils";

export function FeedbackModal() {
  const { isOpen, close, defaultType, appContext } = useFeedbackStore();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [type, setType] = React.useState<"bug" | "feature_request">("bug");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("other");
  const [contactEmail, setContactEmail] = React.useState("");
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);
  const [telemetry, setTelemetry] = React.useState<TelemetryPayload | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const createMutation = useCreateFeedbackMutation();

  // Reset or initialize state whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setTitle("");
      setDescription("");
      setCategory("other");
      setContactEmail(user?.email || "");
      setIsSuccess(false);
      setErrorMessage(null);
      setShowDiagnostics(false);

      // Collect real-time client diagnostics
      const payload = collectDiagnostics(appContext);
      setTelemetry(payload);
    }
  }, [isOpen, defaultType, appContext, user?.email]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (title.trim().length < 3) {
      setErrorMessage("Please enter a title of at least 3 characters.");
      return;
    }
    if (description.trim().length < 10) {
      setErrorMessage("Please describe the issue or idea with at least 10 characters.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        type,
        title: title.trim(),
        description: description.trim(),
        category: category || "other",
        email: contactEmail.trim() || undefined,
        metadata: (telemetry as unknown as Record<string, unknown>) ?? {},
      });

      setIsSuccess(true);
      setTimeout(() => {
        close();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Failed to submit feedback. Please try again.",
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !createMutation.isPending) {
          close();
        }
      }}
    >
      <div className="w-full max-w-lg bg-surface-1 border border-border-strong/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h2 id="feedback-dialog-title" className="text-base font-semibold text-foreground tracking-tight">
              {type === "bug" ? "Report an Issue" : "Suggest an Idea"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {type === "bug"
                ? "Notice something broken? Help us fix it."
                : "Have an idea to make Locus better? Let us know."}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            disabled={createMutation.isPending}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success State */}
        {isSuccess ? (
          <div className="py-14 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Thank You!
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Your feedback has been recorded along with diagnostic context. We appreciate your help!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
            {/* Elegant Segmented Pill Switcher */}
            <div className="flex p-1 rounded-xl bg-surface-2 border border-border/60">
              <button
                type="button"
                onClick={() => setType("bug")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  type === "bug"
                    ? "bg-surface-1 text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Bug className={cn("w-3.5 h-3.5", type === "bug" ? "text-destructive" : "")} />
                <span>Bug Report</span>
              </button>

              <button
                type="button"
                onClick={() => setType("feature_request")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  type === "feature_request"
                    ? "bg-surface-1 text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Sparkles className={cn("w-3.5 h-3.5", type === "feature_request" ? "text-accent" : "")} />
                <span>Feature Request</span>
              </button>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-1.5">
              <label htmlFor="fb-title" className="text-xs font-medium text-foreground">
                Summary <span className="text-destructive">*</span>
              </label>
              <input
                id="fb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === "bug"
                    ? "What went wrong?"
                    : "What would you like to see?"
                }
                required
                maxLength={200}
                className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-surface-2/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Category & Contact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="fb-category" className="text-xs font-medium text-foreground">
                  Area
                </label>
                <div className="relative">
                  <select
                    id="fb-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3.5 pr-8 rounded-xl border border-border/80 bg-surface-2/40 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer"
                  >
                    <option value="playback">Video Playback</option>
                    <option value="youtube_sync">YouTube Sync</option>
                    <option value="ui">User Interface</option>
                    <option value="search">Search</option>
                    <option value="performance">Performance</option>
                    <option value="other">General / Other</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="fb-email" className="text-xs font-medium text-foreground">
                  Email (optional)
                </label>
                <input
                  id="fb-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="For follow-up updates"
                  className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-surface-2/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label htmlFor="fb-desc" className="text-xs font-medium text-foreground">
                Details <span className="text-destructive">*</span>
              </label>
              <textarea
                id="fb-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === "bug"
                    ? "Steps to reproduce, what you expected, etc."
                    : "Explain the feature and how you would use it."
                }
                required
                maxLength={5000}
                className="w-full p-3 rounded-xl border border-border/80 bg-surface-2/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-y"
              />
            </div>

            {/* Automated Telemetry Card */}
            <div className="rounded-xl border border-border/60 bg-surface-2/30 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="w-full flex items-center justify-between p-3 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium text-foreground text-xs">
                    Debug info attached
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    ({telemetry?.device.os || "Device"} • {telemetry?.device.browser || "Browser"})
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <span>{showDiagnostics ? "Hide" : "Review"}</span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform duration-200",
                      showDiagnostics && "rotate-180",
                    )}
                  />
                </div>
              </button>

              {showDiagnostics && telemetry && (
                <div className="p-3.5 border-t border-border/40 bg-surface-2/50 space-y-2.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Passwords and session tokens are strictly redacted.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                    <div className="p-2 rounded-lg bg-surface-1 border border-border/40 space-y-0.5">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Monitor className="w-3 h-3" />
                        <span>Environment</span>
                      </div>
                      <p className="font-medium text-foreground truncate">
                        {telemetry.device.os} • {telemetry.device.browser}
                      </p>
                      <p className="text-muted-foreground">
                        {telemetry.device.viewport}
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-surface-1 border border-border/40 space-y-0.5">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Navigation className="w-3 h-3" />
                        <span>Route</span>
                      </div>
                      <p className="font-medium text-foreground truncate" title={telemetry.pathname}>
                        {telemetry.pathname || "/"}
                      </p>
                      <p className="text-muted-foreground truncate">
                        {telemetry.previousUrl ? `from ${telemetry.previousUrl}` : "direct entry"}
                      </p>
                    </div>
                  </div>

                  {telemetry.consoleErrors.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1">
                      <div className="flex items-center gap-1.5 text-destructive text-[10px] font-semibold font-mono">
                        <Terminal className="w-3 h-3" />
                        <span>{telemetry.consoleErrors.length} recent error logs</span>
                      </div>
                      <div className="max-h-20 overflow-y-auto space-y-1 font-mono text-[10px]">
                        {telemetry.consoleErrors.map((err, i) => (
                          <div key={i} className="text-destructive/90 truncate">
                            • {err.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={close}
                disabled={createMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send {type === "bug" ? "Report" : "Request"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
