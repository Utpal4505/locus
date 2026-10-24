"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Bug,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  DollarSign,
  FileText,
  Flame,
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
      <div className="max-w-6xl mx-auto py-24 px-4 text-center">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  // 404 for unauthorized users
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-28 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto text-muted-foreground">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold">404 - Page Not Found</h1>
        <p className="text-xs text-muted-foreground">
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
  const ai = metrics?.aiClassification;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </Link>
            <span className="text-muted-foreground">•</span>
            <Badge variant="destructive" className="text-[10px] uppercase font-mono tracking-wider">
              Admin Exclusive
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-primary" />
            <span>Internal Platform Monitor</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Live telemetry, active users, YouTube sync pipelines, OpenAI burn rate, and database volume.
          </p>
        </div>

        {/* Action Controls & Fast Navigation */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 font-medium"
          >
            <Link href="/admin/feedback">
              <MessageSquare className="w-3.5 h-3.5 text-destructive" />
              <span>Bug Triage ({st?.openBugs || 0})</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 font-medium"
          >
            <Link href="/settings/monitoring">
              <Bot className="w-3.5 h-3.5 text-primary" />
              <span>AI Tagging</span>
            </Link>
          </Button>

          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-9 px-3 rounded-lg border text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer ${
              autoRefresh
                ? "bg-surface-2 border-border text-foreground"
                : "bg-surface-1 border-border/60 text-muted-foreground"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
              }`}
            />
            <span>30s Auto</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-16 text-center border-border/80">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm font-semibold text-foreground">Loading platform telemetry...</p>
          <p className="text-xs text-muted-foreground mt-1">Collecting aggregated database counters.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          
          {/* SECTION 1: User Activity & Engagement */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              <Users className="w-4 h-4 text-primary" />
              <span>User Telemetry & Live Activity</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <Card className="p-4 border-border/80 bg-surface-1 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                  <span>DAU (24h)</span>
                  <Activity className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{u?.activeUsers24h ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  active sessions in 24h
                </p>
              </Card>

              <Card className="p-4 border-emerald-500/30 bg-emerald-500/5 space-y-1">
                <div className="flex items-center justify-between text-emerald-500 text-[11px] font-mono">
                  <span className="font-bold">Online Now</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <p className="text-2xl font-bold text-emerald-500">{u?.activeUsers30m ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  active in last 30m
                </p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                  <span>Total Users</span>
                  <Users className="w-3.5 h-3.5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{u?.totalUsers ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  +{u?.newUsersToday ?? 0} today • +{u?.newUsersThisWeek ?? 0} this wk
                </p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                  <span>Onboarding</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{onboardingRate}%</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {u?.onboardingCompletedCount ?? 0} completed
                </p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                  <span>YT Connected</span>
                  <Tv className="w-3.5 h-3.5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{u?.youtubeConnectedCount ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {u?.youtubeRevokedCount ?? 0} revoked/expired
                </p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                  <span>Verified Email</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{u?.emailVerifiedCount ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  verified user accounts
                </p>
              </Card>
            </div>
          </div>

          {/* SECTION 2: Ingestion & YouTube Sync Health */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                <Zap className="w-4 h-4 text-accent" />
                <span>YouTube Ingestion & Sync Health (Last 24 Hours)</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                2h Background Cycle
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <Card className="p-4 border-border/80 bg-surface-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Sync Reliability</span>
                  <Badge variant={syncSuccessRate >= 90 ? "default" : "destructive"} className="text-[10px] py-0">
                    {syncSuccessRate}% Success
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-foreground">{s?.totalRuns24h ?? 0} runs</p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <span className="text-emerald-500 font-semibold">{s?.succeededRuns24h ?? 0} OK</span>
                  <span>•</span>
                  <span className="text-amber-500 font-semibold">{s?.partialRuns24h ?? 0} Partial</span>
                  <span>•</span>
                  <span className="text-destructive font-semibold">{s?.failedRuns24h ?? 0} Failed</span>
                </div>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>New Videos Ingested</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{s?.videosIngestedToday ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  fresh uploads saved today
                </p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Trigger Breakdown</span>
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono">
                  <div className="p-1 rounded-sm bg-surface-2 border border-border">
                    <p className="text-xs font-bold text-foreground">{s?.triggerBreakdown.scheduled ?? 0}</p>
                    <p className="text-[9px] text-muted-foreground">2h Auto</p>
                  </div>
                  <div className="p-1 rounded-sm bg-surface-2 border border-border">
                    <p className="text-xs font-bold text-foreground">{s?.triggerBreakdown.on_open ?? 0}</p>
                    <p className="text-[9px] text-muted-foreground">On-Open</p>
                  </div>
                  <div className="p-1 rounded-sm bg-surface-2 border border-border">
                    <p className="text-xs font-bold text-foreground">{s?.triggerBreakdown.manual ?? 0}</p>
                    <p className="text-[9px] text-muted-foreground">Manual</p>
                  </div>
                </div>
              </Card>

              <Card className={`p-4 space-y-1.5 ${s && s.staleChannelsCount > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border/80 bg-surface-1"}`}>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className={s && s.staleChannelsCount > 0 ? "text-amber-500 font-semibold" : "text-muted-foreground"}>
                    Channel Freshness
                  </span>
                  {s && s.staleChannelsCount > 0 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>
                <p className={`text-2xl font-bold ${s && s.staleChannelsCount > 0 ? "text-amber-500" : "text-foreground"}`}>
                  {s?.staleChannelsCount ?? 0} Stale
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  channels not fetched in &gt; 24h
                </p>
              </Card>
            </div>
          </div>

          {/* SECTION 3: AI Video Classification & OpenAI Cost Burn */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                <Bot className="w-4 h-4 text-primary" />
                <span>AI Classification Pipeline & OpenAI Costs</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                gpt-4o-mini Batch API
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <Card className="p-4 border-border/80 bg-surface-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Total OpenAI Cost</span>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-2xl font-bold text-foreground">${ai?.totalCostUsd ?? 0}</p>
                  <p className="text-xs font-mono text-muted-foreground">₹{ai?.estimatedCostInr ?? 0} INR</p>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono pt-1">
                  Today: ${ai?.costTodayUsd ?? 0} (₹{ai?.costTodayInr ?? 0})
                </p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Unit Economics</span>
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${ai?.averageCostPerVideoUsd ? ai.averageCostPerVideoUsd.toFixed(5) : "0.00030"}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  approx. ₹{(ai?.averageCostPerVideoUsd ? ai.averageCostPerVideoUsd * 86 : 0.025).toFixed(3)} per video
                </p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Classified Catalog</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{ai?.totalVideosClassified ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  videos enriched with topics
                </p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Queue Backlog</span>
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                  <Badge variant="outline" className="text-[10px]">
                    {ai?.pendingCount ?? 0} Pending
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {ai?.submittedCount ?? 0} In Flight
                  </Badge>
                  {ai && ai.failedCount > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {ai.failedCount} Failed
                    </Badge>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* SECTION 4: Database Storage & Catalog Volume */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              <Database className="w-4 h-4 text-primary" />
              <span>Catalog & Platform Storage</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <Card className="p-4 border-border/80 bg-surface-1 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Videos</span>
                  <Video className="w-3.5 h-3.5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{st?.totalVideos ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">total catalog items</p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Channels</span>
                  <Tv className="w-3.5 h-3.5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{st?.totalSources ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">tracked sources</p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Library State</span>
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{st?.totalLibraryItems ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">queue / fav / history</p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>User Notes</span>
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{st?.totalNotes ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">timestamped notes</p>
              </Card>

              <Card className="p-4 border-border/80 bg-surface-1 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Feedbacks</span>
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{st?.totalFeedbacks ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">user tickets</p>
              </Card>

              <Card className="p-4 border-destructive/30 bg-destructive/5 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-destructive">
                  <span className="font-bold">Open Bugs</span>
                  <Bug className="w-3.5 h-3.5" />
                </div>
                <p className="text-2xl font-bold text-destructive">{st?.openBugs ?? 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">untriaged issues</p>
              </Card>
            </div>
          </div>

          {/* SECTION 5: Infrastructure & Node Server Specs */}
          <Card className="p-4 border-border/80 bg-surface-2/40 flex items-center justify-between gap-4 flex-wrap text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-primary" />
                <span>Node: <strong className="text-foreground">{sys?.nodeVersion}</strong></span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                <span>Env: <strong className="text-foreground uppercase">{sys?.environment}</strong></span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Uptime: <strong className="text-foreground">{formatUptime(sys?.uptimeSeconds ?? 0)}</strong></span>
              </div>
            </div>

            <div className="text-[11px]">
              Last refreshed: {sys?.timestamp ? new Date(sys.timestamp).toLocaleTimeString() : "just now"}
            </div>
          </Card>

        </div>
      )}
    </div>
  );
}
