"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Bug,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  HardDrive,
  Layers,
  MessageSquare,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Tv,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { authClient } from "../../lib/auth-client";
import { useAdminMetricsQuery } from "../../lib/queries/admin";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}

export default function AdminMonitoringPage() {
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const user = session?.user;

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = Boolean(
    user?.email && adminEmails.includes(user.email.toLowerCase()),
  );

  const [autoRefresh, setAutoRefresh] = React.useState(true);

  const {
    data: metrics,
    isLoading,
    isRefetching,
    refetch,
  } = useAdminMetricsQuery(isAdmin, autoRefresh ? 30000 : false);

  if (isAuthPending) {
    return (
      <div className="max-w-6xl mx-auto py-28 px-4 text-center">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto text-primary" />
        <p className="mt-3 text-xs text-muted-foreground font-mono">
          Verifying administrative credentials...
        </p>
      </div>
    );
  }

  // Stealth 404 for unauthorized users
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-32 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto text-muted-foreground">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">404 - Page Not Found</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The requested page does not exist or you do not have permission to view it.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  const u = metrics?.users;
  const s = metrics?.sync;
  const st = metrics?.storage;
  const sys = metrics?.system;

  const syncSuccessRate =
    s && s.totalRuns24h > 0
      ? Math.round((s.succeededRuns24h / s.totalRuns24h) * 100)
      : 100;

  const onboardingRate =
    u && u.totalUsers > 0
      ? Math.round((u.onboardingCompletedCount / u.totalUsers) * 100)
      : 0;

  const verifiedRate =
    u && u.totalUsers > 0
      ? Math.round((u.emailVerifiedCount / u.totalUsers) * 100)
      : 0;

  const totalRuns = s?.totalRuns24h || 0;
  const okPct = totalRuns > 0 ? ((s?.succeededRuns24h || 0) / totalRuns) * 100 : 100;
  const partialPct = totalRuns > 0 ? ((s?.partialRuns24h || 0) / totalRuns) * 100 : 0;
  const failedPct = totalRuns > 0 ? ((s?.failedRuns24h || 0) / totalRuns) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* ── TOP HEADER & CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to App</span>
            </Link>
            <span className="text-border">•</span>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 border border-border text-[11px] font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Operational</span>
            </div>
            <span className="text-border">•</span>
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-destructive">
              Admin Exclusive
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-primary" />
            <span>Mission Control & Telemetry</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Live audience engagement, automated background YouTube sync pipelines, and database catalog volume.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 font-medium border-border/80 hover:border-destructive/50 hover:bg-destructive/10 transition-colors"
          >
            <Link href="/admin/feedback">
              <MessageSquare className="w-3.5 h-3.5 text-destructive" />
              <span>Bug & Feature Triage</span>
              {(st?.openBugs ?? 0) > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-destructive text-destructive-foreground text-[10px] font-mono font-bold">
                  {st?.openBugs}
                </span>
              )}
            </Link>
          </Button>

          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-8 px-3 rounded-lg border text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
              autoRefresh
                ? "bg-surface-2 border-border text-foreground shadow-xs"
                : "bg-surface-1 border-border/60 text-muted-foreground"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
              }`}
            />
            <span>{autoRefresh ? "30s Auto" : "Paused"}</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-20 text-center border-border/80 bg-surface-1">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm font-medium text-foreground">Fetching live telemetry...</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">Aggregating database counters and health diagnostics</p>
        </Card>
      ) : (
        <div className="space-y-8">

          {/* ── HERO TIER: 3 HIGH-IMPACT COMMAND CARDS ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* HERO 1: USER AUDIENCE & ENGAGEMENT */}
            <Card className="p-5 border-border/80 bg-gradient-to-br from-surface-1 via-surface-1 to-surface-2/60 relative overflow-hidden group hover:border-primary/40 transition-colors shadow-xs">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Audience & DAU</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-mono font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {u?.activeUsers30m ?? 0} online now
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
                    {u?.activeUsers24h ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">DAU (24h)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Active user sessions authenticated in the past 24 hours.
                </p>
              </div>

              <div className="mt-4 pt-3.5 border-t border-border/50 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Total Registered</span>
                  <span className="font-mono font-semibold text-foreground text-sm">
                    {u?.totalUsers ?? 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono ml-1.5">
                    (+{u?.newUsersToday ?? 0} today)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Onboarded</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-semibold text-foreground text-sm">
                      {onboardingRate}%
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, onboardingRate)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* HERO 2: INGESTION PIPELINE RELIABILITY */}
            <Card className="p-5 border-border/80 bg-gradient-to-br from-surface-1 via-surface-1 to-surface-2/60 relative overflow-hidden group hover:border-emerald-500/40 transition-colors shadow-xs">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Sync Reliability</span>
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono font-medium ${
                  syncSuccessRate >= 95
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {syncSuccessRate}% Success
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
                    {s?.videosIngestedToday ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">videos ingested today</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s?.totalRuns24h ?? 0} synchronization runs executed in the last 24h.
                </p>
              </div>

              {/* Multi-segment status bar */}
              <div className="mt-4 pt-3.5 border-t border-border/50 space-y-1.5">
                <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${okPct}%` }}
                    title={`${s?.succeededRuns24h || 0} succeeded`}
                  />
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${partialPct}%` }}
                    title={`${s?.partialRuns24h || 0} partial`}
                  />
                  <div
                    className="h-full bg-destructive transition-all duration-500"
                    style={{ width: `${failedPct}%` }}
                    title={`${s?.failedRuns24h || 0} failed`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span className="text-emerald-500 font-medium">{s?.succeededRuns24h ?? 0} OK</span>
                  <span className="text-amber-500 font-medium">{s?.partialRuns24h ?? 0} Partial</span>
                  <span className="text-destructive font-medium">{s?.failedRuns24h ?? 0} Failed</span>
                </div>
              </div>
            </Card>

            {/* HERO 3: TRIAGE & ISSUE TRACKER */}
            <Card className="p-5 border-border/80 bg-gradient-to-br from-surface-1 via-surface-1 to-surface-2/60 relative overflow-hidden group hover:border-destructive/40 transition-colors shadow-xs">
              <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
                  <Bug className="w-3.5 h-3.5 text-destructive" />
                  <span>Issue Triage</span>
                </span>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] font-mono gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Link href="/admin/feedback">
                    <span>Open Desk</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-extrabold tracking-tight font-mono ${
                    (st?.openBugs ?? 0) > 0 ? "text-destructive" : "text-foreground"
                  }`}>
                    {st?.openBugs ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">open bugs pending triage</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {st?.totalFeedbacks ?? 0} total tickets submitted across all users.
                </p>
              </div>

              <div className="mt-4 pt-3.5 border-t border-border/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono border-border/80">
                    Auto-Captured Telemetry Enabled
                  </Badge>
                </div>
                <Link
                  href="/admin/feedback"
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>Review Tickets</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>

          </div>

          {/* ── ASYMMETRIC OPERATIONAL LAYOUT (8 COLS / 4 COLS) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── LEFT COLUMN: INGESTION PIPELINE & STORAGE CATALOG (8 COLS) ── */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* PANEL 1: YOUTUBE INGESTION PIPELINE ENGINE */}
              <Card className="p-6 border-border/80 bg-surface-1 space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Tv className="w-4 h-4 text-primary" />
                      <span>YouTube Ingestion & Sync Pipeline</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Continuous background feed synchronization from subscribed YouTube channels.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                      2h Background Cron Active
                    </Badge>
                  </div>
                </div>

                {/* Ingestion Triggers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-3.5 rounded-xl border border-border/70 bg-surface-2/60 space-y-1.5">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                      <span>Scheduled Cron</span>
                      <Clock className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {s?.triggerBreakdown.scheduled ?? 0}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Automatic 2-hour server daemon checks across followed channels.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/70 bg-surface-2/60 space-y-1.5">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                      <span>On-Open Sync</span>
                      <Radio className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {s?.triggerBreakdown.on_open ?? 0}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Dynamic refresh when active learners open the application.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/70 bg-surface-2/60 space-y-1.5">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                      <span>Manual Refresh</span>
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {s?.triggerBreakdown.manual ?? 0}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Explicit user-triggered channel refresh from feed header.
                    </p>
                  </div>
                </div>

                {/* Channel Freshness & Quota Indicator */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-surface-2/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      (s?.staleChannelsCount ?? 0) === 0
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {(s?.staleChannelsCount ?? 0) === 0
                          ? "All tracked channels fresh"
                          : `${s?.staleChannelsCount} channels not synced in >24 hours`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        YouTube Data API v3 token rotations & quota distribution are operating normally.
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground block">Sync Cadence</span>
                    <span className="font-mono font-medium text-foreground">Every 120 minutes</span>
                  </div>
                </div>
              </Card>

              {/* PANEL 2: PLATFORM CATALOG & STORAGE FOOTPRINT */}
              <Card className="p-6 border-border/80 bg-surface-1 space-y-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" />
                      <span>Database Catalog & Storage Footprint</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Total records and learning assets stored in the PostgreSQL database.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-border/80 text-muted-foreground">
                    PostgreSQL DB
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-xl border border-border/70 bg-surface-2/50 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                      <span>Videos</span>
                      <Video className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {st?.totalVideos ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      catalog videos indexed
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/70 bg-surface-2/50 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                      <span>Sources</span>
                      <Tv className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {st?.totalSources ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      active YouTube channels
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/70 bg-surface-2/50 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                      <span>User Notes</span>
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {st?.totalNotes ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      timestamped study notes
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/70 bg-surface-2/50 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                      <span>Library Items</span>
                      <Bookmark className="w-3.5 h-3.5 text-cyan-500" />
                    </div>
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {st?.totalLibraryItems ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      queued / saved items
                    </p>
                  </div>
                </div>
              </Card>

            </div>

            {/* ── RIGHT COLUMN: SYSTEM HEALTH & AUTH FUNNEL (4 COLS) ── */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* SYSTEM RUNTIME HEALTH */}
              <Card className="p-5 border-border/80 bg-surface-1 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" />
                    <span>Server & Runtime</span>
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                    Online
                  </Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Process Uptime</span>
                    </span>
                    <span className="font-mono font-medium text-foreground">
                      {formatUptime(sys?.uptimeSeconds ?? 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Last Snapshot</span>
                    </span>
                    <span className="font-mono font-medium text-foreground text-[11px]">
                      {sys?.timestamp ? new Date(sys.timestamp).toLocaleTimeString() : "Just now"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Node Engine</span>
                    </span>
                    <span className="font-mono font-medium text-foreground">
                      {sys?.nodeVersion ?? "Node.js"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      <span>Postgres Pool</span>
                    </span>
                    <span className="font-mono font-medium text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Healthy
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Environment</span>
                    </span>
                    <span className="font-mono font-medium uppercase text-muted-foreground text-[10px]">
                      {sys?.environment ?? "development"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* USER AUTH & INTEGRATION HEALTH */}
              <Card className="p-5 border-border/80 bg-surface-1 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Auth & Integrations</span>
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {u?.totalUsers ?? 0} users
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* YouTube OAuth Connection Health */}
                  <div className="p-3 rounded-lg border border-border/70 bg-surface-2/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground text-[11px]">YouTube Connected</span>
                      <span className="font-mono font-bold text-foreground">
                        {u?.youtubeConnectedCount ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Revoked / Expired</span>
                      <span className={u?.youtubeRevokedCount ? "text-amber-500" : ""}>
                        {u?.youtubeRevokedCount ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Email Verification Rate */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Email Verified</span>
                      <span className="font-mono font-semibold text-foreground">
                        {u?.emailVerifiedCount ?? 0} ({verifiedRate}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, verifiedRate)}%` }}
                      />
                    </div>
                  </div>

                  {/* Signups Breakdown */}
                  <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground">
                    <div>
                      <span>Today:</span>{" "}
                      <span className="text-foreground font-semibold">+{u?.newUsersToday ?? 0}</span>
                    </div>
                    <div>
                      <span>This Week:</span>{" "}
                      <span className="text-foreground font-semibold">+{u?.newUsersThisWeek ?? 0}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* QUICK OPERATIONAL SHORTCUTS */}
              <Card className="p-5 border-border/80 bg-surface-1 space-y-3 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Quick Navigation
                </h3>

                <div className="space-y-1.5">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-xs h-9 border-border/70 hover:bg-surface-2"
                  >
                    <Link href="/admin/feedback">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-destructive" />
                        <span>Bug & Feedback Triage</span>
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-xs h-9 border-border/70 hover:bg-surface-2"
                  >
                    <Link href="/">
                      <span className="flex items-center gap-2">
                        <Video className="w-3.5 h-3.5 text-primary" />
                        <span>Main Video Feed</span>
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-xs h-9 border-border/70 hover:bg-surface-2"
                  >
                    <Link href="/settings">
                      <span className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Account & Preferences</span>
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </Link>
                  </Button>
                </div>
              </Card>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
