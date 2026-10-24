"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Bug,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Lightbulb,
  Monitor,
  Navigation,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import { authClient } from "../../../lib/auth-client";
import {
  useAdminFeedbackQuery,
  useAdminFeedbackStatsQuery,
  useUpdateFeedbackMutation,
  useDeleteFeedbackMutation,
} from "../../../lib/queries/feedback";
import { type FeedbackItem } from "@locus/contracts";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";

export default function AdminFeedbackTriagePage() {
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const user = session?.user;

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = Boolean(
    user?.email && adminEmails.includes(user.email.toLowerCase()),
  );

  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [selectedTicket, setSelectedTicket] = React.useState<FeedbackItem | null>(null);
  const [adminNotesDraft, setAdminNotesDraft] = React.useState<string>("");
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);

  // Queries & Mutations
  const queryFilter = React.useMemo(() => {
    return {
      type: typeFilter !== "all" ? (typeFilter as any) : undefined,
      status: statusFilter !== "all" ? (statusFilter as any) : undefined,
      priority: priorityFilter !== "all" ? (priorityFilter as any) : undefined,
      search: searchQuery.trim() || undefined,
      limit: 50,
    };
  }, [typeFilter, statusFilter, priorityFilter, searchQuery]);

  const {
    data: feedbackData,
    isLoading,
    isRefetching,
    refetch,
  } = useAdminFeedbackQuery(queryFilter, isAdmin);

  const { data: stats } = useAdminFeedbackStatsQuery(isAdmin);
  const updateMutation = useUpdateFeedbackMutation();
  const deleteMutation = useDeleteFeedbackMutation();

  // Handle ticket selection for detail inspector
  const handleSelectTicket = (ticket: FeedbackItem) => {
    setSelectedTicket(ticket);
    setAdminNotesDraft(ticket.adminNotes || "");
    setActionFeedback(null);
  };

  // Update status handler
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updated = await updateMutation.mutateAsync({
        id,
        data: { status: newStatus as any },
      });
      if (selectedTicket?.id === id) {
        setSelectedTicket(updated);
      }
      setActionFeedback(`Status updated to "${newStatus}".`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback("Failed to update status.");
    }
  };

  // Update priority handler
  const handlePriorityChange = async (id: string, newPriority: string) => {
    try {
      const updated = await updateMutation.mutateAsync({
        id,
        data: { priority: newPriority as any },
      });
      if (selectedTicket?.id === id) {
        setSelectedTicket(updated);
      }
      setActionFeedback(`Priority updated to "${newPriority}".`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback("Failed to update priority.");
    }
  };

  // Save private admin notes
  const handleSaveNotes = async () => {
    if (!selectedTicket) return;
    try {
      const updated = await updateMutation.mutateAsync({
        id: selectedTicket.id,
        data: { adminNotes: adminNotesDraft },
      });
      setSelectedTicket(updated);
      setActionFeedback("Admin notes saved successfully.");
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback("Failed to save admin notes.");
    }
  };

  // Delete ticket
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this feedback ticket?")) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      if (selectedTicket?.id === id) {
        setSelectedTicket(null);
      }
      setActionFeedback("Ticket permanently deleted.");
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setActionFeedback("Failed to delete ticket.");
    }
  };

  // If loading session, show subtle loading state
  if (isAuthPending) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  // If not admin, completely hide the page with 404
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
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

  const items = feedbackData?.items ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Link>
            <span className="text-muted-foreground">•</span>
            <Badge variant="destructive" className="text-[10px] uppercase font-mono tracking-wider">
              Admin Exclusive
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-destructive" />
            <span>Feedback & Bug Triage</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Review user reports, auto-captured diagnostics, and feature requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 rounded-md bg-primary/10 border border-primary/30 text-xs text-primary flex items-center justify-between animate-in fade-in">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 border-border/80 bg-surface-1">
          <p className="text-[11px] font-mono text-muted-foreground uppercase">Total Tickets</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats?.total ?? 0}</p>
        </Card>

        <Card className="p-3.5 border-destructive/40 bg-destructive/5">
          <div className="flex items-center justify-between text-destructive">
            <p className="text-[11px] font-mono uppercase font-bold">Open Bugs</p>
            <Bug className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold text-destructive mt-1">{stats?.openBugs ?? 0}</p>
        </Card>

        <Card className="p-3.5 border-red-500/40 bg-red-500/5">
          <div className="flex items-center justify-between text-red-500">
            <p className="text-[11px] font-mono uppercase font-bold">Critical</p>
            <Flame className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold text-red-500 mt-1">{stats?.criticalBugs ?? 0}</p>
        </Card>

        <Card className="p-3.5 border-primary/40 bg-primary/5">
          <div className="flex items-center justify-between text-primary">
            <p className="text-[11px] font-mono uppercase font-bold">Requests</p>
            <Lightbulb className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold text-primary mt-1">{stats?.openFeatureRequests ?? 0}</p>
        </Card>

        <Card className="p-3.5 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-500">
            <p className="text-[11px] font-mono uppercase font-bold">In Progress</p>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold text-amber-500 mt-1">{stats?.inProgress ?? 0}</p>
        </Card>

        <Card className="p-3.5 border-emerald-500/40 bg-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-500">
            <p className="text-[11px] font-mono uppercase font-bold">Resolved</p>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{stats?.resolved ?? 0}</p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border-border/80 bg-surface-1 space-y-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, or submitter..."
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Filter Selects */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-2.5 rounded-md border border-border bg-surface-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Types</option>
              <option value="bug">🐛 Bugs Only</option>
              <option value="feature_request">💡 Features Only</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 rounded-md border border-border bg-surface-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 px-2.5 rounded-md border border-border bg-surface-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Content Layout: Table + Side Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tickets List / Table */}
        <div className={`space-y-3 ${selectedTicket ? "lg:col-span-7" : "lg:col-span-12"}`}>
          {isLoading ? (
            <Card className="p-12 text-center border-border/80">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Loading feedback tickets...</p>
            </Card>
          ) : items.length === 0 ? (
            <Card className="p-12 text-center border-border/80">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold">No tickets match your filters</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Everything looks clean! When users report issues, they will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const isSelected = selectedTicket?.id === item.id;
                const metadata = item.metadata as any;
                const errorCount = metadata?.consoleErrors?.length || 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectTicket(item)}
                    className={`p-4 rounded-md border-2 transition-all cursor-pointer bg-surface-1 ${
                      isSelected
                        ? "border-primary shadow-brutal"
                        : "border-border hover:border-border-strong hover:bg-surface-2/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Badges Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.type === "bug" ? (
                            <Badge variant="destructive" className="text-[10px] py-0 gap-1">
                              <Bug className="w-3 h-3" />
                              <span>Bug</span>
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px] py-0 gap-1">
                              <Lightbulb className="w-3 h-3" />
                              <span>Feature</span>
                            </Badge>
                          )}

                          <Badge
                            variant={
                              item.priority === "critical"
                                ? "destructive"
                                : item.priority === "high"
                                ? "destructive"
                                : "outline"
                            }
                            className="text-[10px] py-0 font-mono uppercase"
                          >
                            {item.priority}
                          </Badge>

                          <Badge variant="outline" className="text-[10px] py-0 font-mono">
                            {item.status}
                          </Badge>

                          {errorCount > 0 && (
                            <Badge variant="outline" className="text-[10px] py-0 text-destructive border-destructive/40 font-mono">
                              {errorCount} console err{errorCount > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-foreground truncate">
                          {item.title}
                        </h4>

                        {/* Submitter & Time */}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                          <span>{item.userEmail || "Anonymous Guest"}</span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>

                      {/* Status Quick Select */}
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className="h-7 px-2 rounded-sm border border-border bg-surface-2 text-[11px] font-mono text-foreground focus:outline-none"
                        >
                          <option value="open">Open</option>
                          <option value="under_review">Under Review</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Diagnostic Inspector Drawer */}
        {selectedTicket && (
          <Card className="lg:col-span-5 p-5 border-2 border-border-strong bg-surface-1 shadow-brutal sticky top-20 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {selectedTicket.type}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ID: {selectedTicket.id.slice(0, 8)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {selectedTicket.title}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleDelete(selectedTicket.id)}
                  className="p-1.5 rounded-sm text-destructive hover:bg-destructive/15 transition-colors cursor-pointer"
                  title="Delete ticket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* User Description */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase font-mono">
                User Report Description
              </p>
              <div className="p-3 rounded-md bg-surface-2 border border-border text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                {selectedTicket.description}
              </div>
            </div>

            {/* Quick Priority & Status Control */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-muted-foreground">Priority</label>
                <select
                  value={selectedTicket.priority}
                  onChange={(e) => handlePriorityChange(selectedTicket.id, e.target.value)}
                  className="w-full h-8 px-2 rounded-sm border border-border bg-surface-2 text-xs font-mono text-foreground"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-muted-foreground">Status</label>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                  className="w-full h-8 px-2 rounded-sm border border-border bg-surface-2 text-xs font-mono text-foreground"
                >
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Automated Telemetry Context */}
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase font-mono flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                <span>Diagnostic Telemetry</span>
              </p>

              {(() => {
                const meta = selectedTicket.metadata as any;
                const device = meta?.device;
                const appContext = meta?.appContext;
                const errors = meta?.consoleErrors ?? [];

                return (
                  <div className="space-y-2 text-[11px] font-mono">
                    {/* Device & Route Card */}
                    <div className="p-2.5 rounded-sm bg-surface-2 border border-border space-y-1.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Monitor className="w-3.5 h-3.5" />
                        <span className="font-bold text-foreground">
                          {device?.os || "Unknown OS"} • {device?.browser || "Unknown Browser"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Viewport: {device?.viewport || "N/A"} • Screen: {device?.screenResolution || "N/A"} • Online: {device?.isOnline ? "Yes" : "No"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Timezone: {meta?.timezone || "UTC"} • Reported: {new Date(selectedTicket.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Navigation Path */}
                    <div className="p-2.5 rounded-sm bg-surface-2 border border-border space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Navigation className="w-3.5 h-3.5" />
                        <span className="font-bold text-foreground">Route Trail</span>
                      </div>
                      <p className="text-[10px] text-primary truncate" title={meta?.url}>
                        URL: {meta?.url || meta?.pathname || "/"}
                      </p>
                      {meta?.previousUrl && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          Prev: {meta.previousUrl}
                        </p>
                      )}
                      {meta?.routeHistory && meta.routeHistory.length > 0 && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          History: {meta.routeHistory.join(" ➔ ")}
                        </p>
                      )}
                    </div>

                    {/* Video Player App Context */}
                    {appContext && Object.keys(appContext).length > 0 && (
                      <div className="p-2.5 rounded-sm bg-surface-2 border border-border space-y-1">
                        <p className="font-bold text-foreground text-[10px] uppercase">
                          Player / App State
                        </p>
                        <pre className="text-[10px] overflow-x-auto text-muted-foreground">
                          {JSON.stringify(appContext, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Captured Console Errors */}
                    {errors.length > 0 ? (
                      <div className="p-2.5 rounded-sm bg-destructive/10 border border-destructive/30 space-y-1.5">
                        <p className="font-bold text-destructive text-[10px] uppercase flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Console Errors ({errors.length})</span>
                        </p>
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {errors.map((err: any, i: number) => (
                            <div key={i} className="text-[10px] text-destructive border-b border-destructive/20 pb-1">
                              <p className="font-bold">{err.message}</p>
                              {err.stack && (
                                <pre className="text-[9px] text-destructive/80 mt-0.5 overflow-x-auto">
                                  {err.stack.slice(0, 300)}...
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">
                        No console errors were captured in client buffer.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Admin Private Notes Editor */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-xs font-semibold text-muted-foreground uppercase font-mono">
                Admin Notes (Private to you)
              </label>
              <textarea
                rows={3}
                value={adminNotesDraft}
                onChange={(e) => setAdminNotesDraft(e.target.value)}
                placeholder="Internal notes, bug cause, scheduled fix version..."
                className="w-full p-2.5 rounded-md border border-border bg-surface-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSaveNotes}
                disabled={updateMutation.isPending}
                className="w-full text-xs font-mono"
              >
                {updateMutation.isPending ? "Saving..." : "Save Admin Notes"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

