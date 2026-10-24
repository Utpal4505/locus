"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  useClassificationMetricsQuery,
  useRetryFailedVideosMutation,
  useBackfillVideosMutation,
} from "../../../lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

export default function ClassificationMonitoringPage() {
  const isEnabled = process.env.NEXT_PUBLIC_AI_VIDEO_TAGGING_ENABLED === "true";

  if (!isEnabled) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Settings</span>
        </Link>

        <Card className="p-8 text-center border-border/70">
          <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            AI Video Tagging & Monitoring is Disabled
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            The AI-based video tagging and OpenAI Batch processing feature is currently deactivated in server configuration.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 py-2 hover:bg-primary/90"
          >
            Return to Settings
          </Link>
        </Card>
      </div>
    );
  }

  const { data: metrics, isLoading, isRefetching, refetch } = useClassificationMetricsQuery();
  const retryMutation = useRetryFailedVideosMutation();
  const backfillMutation = useBackfillVideosMutation();

  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);

  const handleRetryFailed = async () => {
    setActionFeedback(null);
    try {
      const res = await retryMutation.mutateAsync();
      setActionFeedback(`Successfully reset ${res.retriedCount} failed video(s) for retry.`);
      refetch();
    } catch {
      setActionFeedback("Failed to trigger retries.");
    }
  };

  const handleBackfill = async () => {
    setActionFeedback(null);
    try {
      const res = await backfillMutation.mutateAsync(500);
      setActionFeedback(`Backfilled ${res.queuedCount} unclassified video(s) into pending queue.`);
      refetch();
    } catch {
      setActionFeedback("Failed to trigger backfill.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Settings</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-primary" />
            <span>AI Tagging & Batch Monitoring</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono">
            Operational dashboard tracking GPT-6 Luna token expenditure, batch statuses, and failure recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="cursor-pointer font-mono text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleBackfill}
            disabled={backfillMutation.isPending}
            className="cursor-pointer font-mono text-xs"
            title="Scan and queue existing videos that have never been classified"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Backfill Unclassified
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleRetryFailed}
            disabled={retryMutation.isPending}
            className="cursor-pointer font-mono text-xs"
            title="Reset failed videos to pending state"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Retry Failed
          </Button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 rounded-lg bg-surface-2 border border-border text-xs font-mono text-foreground flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-sm font-mono text-muted-foreground">
          Loading classification telemetry...
        </div>
      ) : !metrics ? (
        <div className="p-12 text-center text-sm font-mono text-destructive">
          Failed to load telemetry. Please ensure the API is running and authenticated.
        </div>
      ) : (
        <>
          {/* High-Level Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-surface-1">
              <span className="text-xs font-mono text-muted-foreground block mb-1">Total Classified</span>
              <span className="text-2xl font-black text-foreground">{metrics.totalVideosClassified}</span>
              <span className="text-[11px] font-mono text-muted-foreground block mt-1">
                {metrics.videosWithZeroTags} zero-tag videos
              </span>
            </Card>

            <Card className="p-4 bg-surface-1">
              <span className="text-xs font-mono text-muted-foreground block mb-1">Total API Cost</span>
              <span className="text-2xl font-black text-success">
                ${metrics.totalCostUsd.toFixed(4)}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground block mt-1">
                ≈ ₹{metrics.estimatedCostInr.toFixed(2)} INR
              </span>
            </Card>

            <Card className="p-4 bg-surface-1">
              <span className="text-xs font-mono text-muted-foreground block mb-1">Success Rate</span>
              <span className="text-2xl font-black text-primary">
                {metrics.successRatePercent.toFixed(1)}%
              </span>
              <span className="text-[11px] font-mono text-muted-foreground block mt-1">
                {metrics.retryRatePercent.toFixed(1)}% retry rate
              </span>
            </Card>

            <Card className="p-4 bg-surface-1">
              <span className="text-xs font-mono text-muted-foreground block mb-1">Tokens Consumed</span>
              <span className="text-2xl font-black text-foreground">
                {(metrics.totalTokens / 1000).toFixed(1)}k
              </span>
              <span className="text-[11px] font-mono text-muted-foreground block mt-1">
                Avg ${(metrics.averageCostPerVideoUsd * 100).toFixed(3)}¢ / vid
              </span>
            </Card>
          </div>

          {/* Queue & State Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-5 bg-surface-1">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-mono mb-4">
                Video Ingestion Pipeline Queue
              </CardTitle>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs font-mono text-muted-foreground block">Pending</span>
                  <span className="text-xl font-bold text-amber-500">{metrics.statusBreakdown.pending}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs font-mono text-muted-foreground block">Submitted</span>
                  <span className="text-xl font-bold text-sky-400">{metrics.statusBreakdown.submitted}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs font-mono text-muted-foreground block">Completed</span>
                  <span className="text-xl font-bold text-success">{metrics.statusBreakdown.completed}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs font-mono text-muted-foreground block">Failed</span>
                  <span className="text-xl font-bold text-destructive">{metrics.statusBreakdown.failed}</span>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-surface-1">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-mono mb-4">
                Token Usage Breakdown
              </CardTitle>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Input / Prompt Tokens:</span>
                  <span className="font-bold">{metrics.totalInputTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Output / Completion Tokens:</span>
                  <span className="font-bold">{metrics.totalOutputTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Avg Cost Per Video (INR):</span>
                  <span className="font-bold text-success">₹{metrics.averageCostPerVideoInr.toFixed(4)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent OpenAI Batches Table */}
          <Card className="p-5 bg-surface-1 space-y-4">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Recent OpenAI Batch Jobs</span>
              <span className="text-xs font-mono text-muted-foreground font-normal">
                {metrics.recentBatches.length} batches recorded
              </span>
            </CardTitle>

            {metrics.recentBatches.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                No batch jobs submitted yet. Once videos are fetched from followed channels, the background scheduler will create batches.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 px-3">Batch ID</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Requests</th>
                      <th className="py-2 px-3">Success / Fail</th>
                      <th className="py-2 px-3">Submitted At</th>
                      <th className="py-2 px-3 text-right">Cost (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentBatches.map((b) => (
                      <tr key={b.id} className="border-b border-border/40 hover:bg-surface-2/40">
                        <td className="py-2.5 px-3 truncate max-w-[140px]" title={b.openaiBatchId || b.id}>
                          {b.openaiBatchId || b.id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              b.status === "completed"
                                ? "bg-success/15 text-success"
                                : b.status === "failed" || b.status === "expired"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-sky-500/15 text-sky-400"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{b.requestCount}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-success">{b.successCount}</span> /{" "}
                          <span className={b.failureCount > 0 ? "text-destructive" : "text-muted-foreground"}>
                            {b.failureCount}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {b.submittedAt ? new Date(b.submittedAt).toLocaleTimeString() : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-success">
                          ${b.totalCostUsd.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

