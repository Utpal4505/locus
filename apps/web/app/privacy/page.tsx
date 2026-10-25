import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  Database,
  Server,
  Mail,
  ExternalLink,
  AlertTriangle,
  FileText,
  KeyRound,
  Trash2,
  RefreshCw,
  Globe2,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";

export const metadata: Metadata = {
  title: "Privacy Policy — Locus",
  description:
    "Comprehensive, transparent Privacy Policy for Locus. Learn how we collect, store, encrypt, and handle your data, Google and YouTube account integrations, and your privacy rights.",
};

const TOC_SECTIONS = [
  { id: "overview", title: "1. Overview & Core Philosophy" },
  { id: "information-collected", title: "2. Information We Collect" },
  { id: "google-youtube-auth", title: "3. Google Sign-In & YouTube Authorization" },
  { id: "limited-use-policy", title: "4. Google API & Limited Use Requirements" },
  { id: "youtube-data-usage", title: "5. YouTube API Data & Permitted Uses" },
  { id: "user-generated-content", title: "6. User-Generated Content & Notes" },
  { id: "cookies-storage", title: "7. Cookies, Sessions & Local Storage" },
  { id: "email-communications", title: "8. Transactional Email Communications" },
  { id: "third-party-services", title: "9. Third-Party Service Providers" },
  { id: "retention-deletion", title: "10. Data Retention & Deletion (Gaps)" },
  { id: "disconnecting-revoking", title: "11. Disconnecting & Revoking Access" },
  { id: "security-practices", title: "12. Security Architecture & Limitations" },
  { id: "international-transfers", title: "13. International Data Transfers" },
  { id: "childrens-privacy", title: "14. Children's Privacy" },
  { id: "privacy-rights", title: "15. Your Privacy Rights & Exercises" },
  { id: "policy-changes", title: "16. Changes to this Policy" },
  { id: "contact-information", title: "17. Contact & Legal Entity Details" },
];

export default function PrivacyPolicyPage() {
  return (
    <AppShell>
      <div className="w-full bg-background min-h-screen pb-16">
        {/* Top Accent Neo-brutalist Banner */}
        <div className="border-b-2 border-border-strong bg-surface-2/70 py-3 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Link href="/" className="hover:text-foreground underline underline-offset-2">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground font-semibold">Privacy Policy</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-border-strong text-[10px] bg-surface-1">
                STATUS: ACTIVE
              </Badge>
              <span className="text-muted-foreground">Effective: October 25, 2026</span>
            </div>
          </div>
        </div>

        {/* Hero Header */}
        <header className="border-b-2 border-border-strong bg-surface-1 py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="accent" className="gap-1.5 py-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>LEGAL &amp; DATA PRACTICES</span>
              </Badge>
              <Badge variant="outline" className="text-[10px] border-border-strong font-mono">
                CODE AUDIT VERIFIED
              </Badge>
              <Badge variant="outline" className="text-[10px] border-border-strong font-mono">
                VERSION 1.0
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
              Locus Privacy Policy
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
              This Privacy Policy explains how Locus collects, stores, processes, and protects your personal
              information and third-party data when you use our web application, API services, and YouTube-focused
              learning environment.
            </p>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-2 text-xs font-mono text-muted-foreground border-t border-border/80">
              <div>
                <span className="text-foreground font-bold">Effective Date:</span> October 25, 2026
              </div>
              <div>
                <span className="text-foreground font-bold">Last Updated:</span> October 25, 2026
              </div>
              <div>
                <span className="text-foreground font-bold">Compliance Status:</span> Google API Limited Use Adherent
              </div>
            </div>
          </div>
        </header>

        {/* Quick Highlights Summary Card */}
        <section aria-label="Executive Summary" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Card className="border-2 border-border-strong bg-surface-2/40 shadow-brutal">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <CardTitle className="text-base sm:text-lg font-bold">
                  Quick Summary: What You Need to Know
                </CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                We believe in full transparency without legalese. Here are the core pillars of our data practices:
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="flex items-start gap-2.5 p-3 rounded-md bg-surface-1 border border-border">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">No Distraction Algorithms:</span> Locus does not profile
                    your behavior or sell your viewing habits. Your feed is strictly chronological.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-md bg-surface-1 border border-border">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Encrypted Tokens at Rest:</span> YouTube OAuth tokens are
                    encrypted using AES-256-GCM before database storage.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-md bg-surface-1 border border-border">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Strictly Read-Only Access:</span> We request only{" "}
                    <code className="font-mono text-primary text-[11px]">youtube.readonly</code>. We cannot like, comment,
                    subscribe, or alter your YouTube profile.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-md bg-surface-1 border border-border">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Private Notes &amp; Library:</span> Your notes and watch
                    progress are strictly private to your account and never sent to AI classification models.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Main Content & Table of Contents Grid */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sticky Table of Contents Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 rounded-lg border-2 border-border-strong bg-surface-1 p-4 shadow-brutal space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border font-bold text-xs font-mono uppercase tracking-wider text-foreground">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Table of Contents</span>
              </div>
              <nav aria-label="Privacy Policy Sections" className="space-y-1 max-h-[70vh] overflow-y-auto text-xs font-mono pr-1">
                {TOC_SECTIONS.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="block py-1 px-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors truncate"
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Policy Document Body */}
          <main className="lg:col-span-3 space-y-10 text-foreground leading-relaxed">
            {/* Section 1: Overview & Philosophy */}
            <section id="overview" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 01
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">1. Overview &amp; Core Philosophy</h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Locus is a focused learning platform designed to help engineers, students, and professionals organize
                and discover technical YouTube content without the distractions, rabbit holes, and cognitive fatigue of
                conventional recommendation algorithms.
              </p>
              <p className="text-sm sm:text-base text-muted-foreground">
                This Privacy Policy is issued by{" "}
                <span className="font-bold text-foreground">[LEGAL ENTITY NAME / OPERATOR NAME]</span> (&quot;Locus&quot;,
                &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). It applies to your interaction with our web application at{" "}
                <code className="font-mono text-xs text-foreground bg-surface-2 px-1.5 py-0.5 rounded border border-border">
                  locus.teampoint.online
                </code>
                , our backend API services, and any related software or tools provided by Locus.
              </p>
              <div className="p-4 rounded-md border-2 border-border-strong bg-surface-2/60 text-xs sm:text-sm space-y-1.5">
                <p className="font-bold text-foreground">Honest Engineering Disclosure:</p>
                <p className="text-muted-foreground">
                  Unlike conventional privacy policies filled with generalized boilerplate, this document is based
                  directly on an exhaustive audit of our actual code repository, database schema, and third-party integrations.
                  Where an intended user control is not yet implemented in software, we explicitly state it as an
                  implementation gap rather than pretending it exists.
                </p>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 2: Information We Collect */}
            <section id="information-collected" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 02
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">2. Information We Collect</h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                We collect only the minimum personal information required to deliver, secure, and personalize your
                distraction-free learning workspace. We do not engage in behavioral surveillance or data broking.
              </p>

              {/* Data Category Breakdown Table */}
              <div className="overflow-x-auto border-2 border-border-strong rounded-lg bg-surface-1 shadow-brutal-sm">
                <table className="w-full text-left text-xs sm:text-sm font-sans">
                  <thead className="bg-surface-2 border-b-2 border-border-strong font-mono text-[11px] uppercase tracking-wider text-foreground">
                    <tr>
                      <th className="p-3 border-r border-border">Data Category</th>
                      <th className="p-3 border-r border-border">Specific Elements</th>
                      <th className="p-3 border-r border-border">Source</th>
                      <th className="p-3">Purpose &amp; Storage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">Account Credentials</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        Email address, display name, avatar image URL, cryptographically hashed password (for email/password accounts).
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">Directly provided or OAuth provider.</td>
                      <td className="p-3 text-muted-foreground">Authentication and account identification. Stored in <code className="font-mono text-[11px]">user</code> and <code className="font-mono text-[11px]">account</code> tables.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">Authentication Sessions</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        Cryptographic session token, client IP address, User-Agent browser string, expiration timestamp.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">Client HTTP requests.</td>
                      <td className="p-3 text-muted-foreground">Session verification, active login state, brute-force protection. Stored in <code className="font-mono text-[11px]">session</code> table.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">YouTube OAuth Tokens</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        Google OAuth access token, Google refresh token, token expiration timestamp, granted scopes.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">Google OAuth 2.0 service.</td>
                      <td className="p-3 text-muted-foreground">Syncing followed channels and video metadata. <strong>Encrypted with AES-256-GCM</strong> before storage in <code className="font-mono text-[11px]">integrations</code> table.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">User Library &amp; Activity</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        Watch status (<code className="font-mono text-[11px]">isWatched</code>), favorites, learning queue, playback progress seconds, timestamps.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">User interaction in player/feed.</td>
                      <td className="p-3 text-muted-foreground">Maintaining personal queue and bookmarking. Stored in <code className="font-mono text-[11px]">video_library</code> table.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">Personal Notes</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        Markdown text content, video association, creation/modification timestamps.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">User written notes.</td>
                      <td className="p-3 text-muted-foreground">Private study notes. Stored in <code className="font-mono text-[11px]">video_notes</code> table. Never shared publicly.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">Preferences &amp; Follows</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        Followed channel IDs, topic interests, UI theme, default feed mode, pagination settings.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">Settings and onboarding.</td>
                      <td className="p-3 text-muted-foreground">Feed customization. Stored in <code className="font-mono text-[11px]">user_preferences</code>, <code className="font-mono text-[11px]">source_subscriptions</code>, and <code className="font-mono text-[11px]">user_topics</code>.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">Voluntary Feedback &amp; Diagnostics</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        Feedback title, description, category, OS family, browser, viewport, console error buffer (passwords redacted), route breadcrumbs.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">User voluntary bug report submission.</td>
                      <td className="p-3 text-muted-foreground">Bug triage and application support. Stored in <code className="font-mono text-[11px]">feedback</code> table.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 3: Google Sign-In & YouTube Account Authorization */}
            <section id="google-youtube-auth" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 03
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  3. Google Sign-In &amp; YouTube Authorization
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Locus integrates with Google in two distinct, optional ways. It is important to understand the
                difference between them:
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-lg border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-foreground">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <span>A. Google Social Authentication (Sign-In)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    When you click &quot;Continue with Google&quot; on the login page, Google authenticates your identity.
                    Locus receives your basic Google profile information: your name, verified email address, avatar image
                    URL, and unique Google account ID. This is managed through our authentication engine (Better Auth) and
                    used strictly to log you into your Locus account.
                  </p>
                </div>

                <div className="p-4 rounded-lg border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-foreground">
                    <Server className="w-4 h-4 text-primary" />
                    <span>B. YouTube Account Authorization (Channel &amp; Subscription Sync)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    To import your subscribed YouTube channels into Locus, you may explicitly authorize Locus to connect
                    to your YouTube account. This flow requests a single, read-only OAuth permission:
                  </p>
                  <div className="p-2.5 rounded bg-surface-2 border border-border font-mono text-xs text-primary font-bold">
                    https://www.googleapis.com/auth/youtube.readonly
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    We initiate this request using Google&apos;s OAuth 2.0 authorization endpoint with{" "}
                    <code className="font-mono text-xs">access_type=offline</code> and{" "}
                    <code className="font-mono text-xs">prompt=consent</code> so that Google issues a refresh token,
                    enabling ongoing background synchronization of your followed channel uploads. Every OAuth request is
                    protected with a single-use cryptographically random state parameter to prevent CSRF and replay attacks.
                  </p>
                </div>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 4: Google API Services User Data Policy & Limited Use Disclosure */}
            <section id="limited-use-policy" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 04
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  4. Google API Services &amp; Limited Use Requirements
                </h2>
              </div>

              {/* Dedicated High-Visibility Callout for Google Limited Use */}
              <div className="p-5 sm:p-6 rounded-lg border-2 border-primary bg-primary/5 shadow-brutal space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-sm sm:text-base">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>Google API Services User Data Policy Affirmation</span>
                </div>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  Locus&apos;s use and transfer of information received from Google APIs to any other app will adhere to
                  the{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-bold underline underline-offset-2 hover:text-primary-hover inline-flex items-center gap-1"
                  >
                    Google API Services User Data Policy
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  , including the Limited Use requirements.
                </p>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-muted-foreground">
                <p>In accordance with the Limited Use requirements, Locus strictly adheres to the following principles:</p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>
                    <strong className="text-foreground">Feature-Restricted Use:</strong> We only use access to Google user
                    data to provide and improve user-facing features that are prominent in the Locus interface (e.g.,
                    importing subscribed channels, displaying chronological video updates, and organizing learning feeds).
                  </li>
                  <li>
                    <strong className="text-foreground">No Third-Party Transfers:</strong> We do not transfer Google user
                    data to third parties, unless necessary to provide or improve these features, comply with applicable
                    law, or as part of a merger, acquisition, or sale of assets with explicit prior user consent.
                  </li>
                  <li>
                    <strong className="text-foreground">No Advertising Use:</strong> We never use or transfer Google user
                    data to serve advertisements, including personalized, re-targeted, or interest-based advertising.
                  </li>
                  <li>
                    <strong className="text-foreground">No Data Brokering:</strong> We do not sell, rent, or monetize Google
                    user data to data brokers, advertising networks, or any commercial entities.
                  </li>
                  <li>
                    <strong className="text-foreground">No Human Review:</strong> We do not allow humans to read Google
                    user data unless: (1) we have obtained your affirmative agreement for specific messages or records; (2)
                    it is necessary for security purposes such as investigating technical errors, bug triage, or system abuse;
                    (3) it is required to comply with applicable law; or (4) the data is aggregated and anonymized for
                    internal system operations.
                  </li>
                </ul>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 5: Data Obtained via Google / YouTube APIs & Permitted Uses */}
            <section id="youtube-data-usage" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 05
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  5. YouTube API Data &amp; Permitted Uses
                </h2>
              </div>

              <div className="p-4 rounded-lg border-2 border-border-strong bg-surface-2/70 text-xs sm:text-sm space-y-2">
                <div className="font-bold text-foreground flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-primary" />
                  <span>YouTube API Services Terms of Service Disclosure</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Locus uses YouTube API Services to access YouTube video metadata and channel subscriptions. By using
                  Locus, you agree to be bound by the{" "}
                  <a
                    href="https://www.youtube.com/t/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-bold underline underline-offset-2"
                  >
                    YouTube Terms of Service
                  </a>{" "}
                  and acknowledge that your use of YouTube services is subject to the{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-bold underline underline-offset-2"
                  >
                    Google Privacy Policy
                  </a>
                  .
                </p>
              </div>

              <p className="text-sm sm:text-base text-muted-foreground">
                Specifically, when you connect your YouTube account, Locus queries the following YouTube Data API v3
                endpoints:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm font-mono">
                <div className="p-3.5 rounded border-2 border-border-strong bg-surface-1">
                  <span className="font-bold text-foreground block font-sans mb-1">
                    1. Channel Identity (<code className="text-primary">channels?mine=true</code>)
                  </span>
                  <span className="text-muted-foreground font-sans">
                    Resolves your primary YouTube Channel ID and channel title. Used to identify the external linked
                    account in our <code className="font-mono text-xs">integrations</code> table.
                  </span>
                </div>

                <div className="p-3.5 rounded border-2 border-border-strong bg-surface-1">
                  <span className="font-bold text-foreground block font-sans mb-1">
                    2. User Subscriptions (<code className="text-primary">subscriptions?mine=true</code>)
                  </span>
                  <span className="text-muted-foreground font-sans">
                    Fetches your public subscriptions so you can choose which channels to follow inside Locus. Channel
                    metadata is deduplicated in the shared <code className="font-mono text-xs">sources</code> catalog.
                  </span>
                </div>

                <div className="p-3.5 rounded border-2 border-border-strong bg-surface-1">
                  <span className="font-bold text-foreground block font-sans mb-1">
                    3. Uploads Playlists (<code className="text-primary">channels?contentDetails</code>)
                  </span>
                  <span className="text-muted-foreground font-sans">
                    Retrieves the uploads playlist ID for each channel you follow in Locus to facilitate chronological
                    synchronization.
                  </span>
                </div>

                <div className="p-3.5 rounded border-2 border-border-strong bg-surface-1">
                  <span className="font-bold text-foreground block font-sans mb-1">
                    4. Video Metadata (<code className="text-primary">playlistItems</code> &amp; <code className="text-primary">videos</code>)
                  </span>
                  <span className="text-muted-foreground font-sans">
                    Retrieves public titles, descriptions, publication dates, durations, and thumbnails. Stored in our
                    shared <code className="font-mono text-xs">videos</code> table.
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <p className="font-bold text-foreground">YouTube Video Playback via IFrame Player:</p>
                <p>
                  When you watch a video in Locus, it is rendered using the official YouTube IFrame Player API. The video
                  is streamed directly from YouTube servers. YouTube may collect device identifiers, IP addresses, viewing
                  duration, and telemetry directly in the iframe context, governed by Google&apos;s Privacy Policy. Locus does
                  not receive or store this playback telemetry beyond your local progress bar state.
                </p>
                <p className="font-bold text-foreground pt-2">Strict Read-Only Enforcement:</p>
                <p>
                  Locus cannot like videos, leave comments, subscribe or unsubscribe from channels on YouTube on your
                  behalf, edit your playlists, or modify your YouTube account in any way.
                </p>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 6: User-Generated Content & Notes */}
            <section id="user-generated-content" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 06
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  6. User-Generated Content, Notes &amp; AI Privacy
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Locus empowers you to take notes, bookmark videos, and build a focused engineering learning queue:
              </p>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-4 rounded-md border border-border bg-surface-1 space-y-1.5">
                  <span className="font-bold text-foreground">Private Video Notes:</span>
                  <p className="text-muted-foreground">
                    Personal markdown notes taken while watching videos are stored in our{" "}
                    <code className="font-mono text-xs">video_notes</code> table. Each note is strictly tied to your
                    authenticated user account and is completely private. Other Locus users, public search engines, and
                    third parties cannot view or access your notes.
                  </p>
                </div>

                <div className="p-4 rounded-md border border-border bg-surface-1 space-y-1.5">
                  <span className="font-bold text-foreground">Personal Library State:</span>
                  <p className="text-muted-foreground">
                    Your favorites, watch queue, and playback timestamps are stored in the{" "}
                    <code className="font-mono text-xs">video_library</code> table to resume playback smoothly across
                    devices.
                  </p>
                </div>

                <div className="p-4 rounded-md border-2 border-border-strong bg-surface-2/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-foreground font-bold">
                    <Cpu className="w-4 h-4 text-primary" />
                    <span>AI Video Categorization Privacy Boundary:</span>
                  </div>
                  <p className="text-muted-foreground">
                    Locus uses OpenAI batch completion APIs exclusively to categorize public YouTube videos into
                    standardized technical topic tags (e.g., &quot;Distributed Systems&quot;, &quot;TypeScript&quot;,
                    &quot;DevOps&quot;). We send <strong>only public YouTube video titles and truncated descriptions</strong> to
                    OpenAI. Your personal identity, account details, watch history, and private notes are{" "}
                    <strong>NEVER</strong> shared with or processed by OpenAI.
                  </p>
                </div>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 7: Cookies, Authentication Sessions & Local Storage */}
            <section id="cookies-storage" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 07
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  7. Cookies, Sessions &amp; Local Storage
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Locus does not use third-party advertising cookies, behavioral tracking pixels, or cross-site tracking
                scripts. We use only strictly necessary technologies to provide authentication and retain your preferences:
              </p>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded border border-border bg-surface-1 space-y-1">
                  <span className="font-bold text-foreground font-mono">HTTP-Only Session Cookie:</span>
                  <p className="text-muted-foreground">
                    Set by Better Auth upon successful sign-in. Carries your encrypted session identifier over secure HTTP
                    connections (<code className="font-mono text-[11px]">credentials: include</code>). Expires automatically
                    after 7 days and is refreshed every 24 hours of active use. Cannot be accessed by client-side JavaScript.
                  </p>
                </div>

                <div className="p-3.5 rounded border border-border bg-surface-1 space-y-1">
                  <span className="font-bold text-foreground font-mono">Browser Local Storage Items:</span>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-1">
                    <li>
                      <code className="font-mono text-primary text-[11px]">locus-theme</code>: Stores your UI color theme
                      preference (<code className="font-mono text-[11px]">&apos;light&apos;</code> or{" "}
                      <code className="font-mono text-[11px]">&apos;dark&apos;</code>).
                    </li>
                    <li>
                      <code className="font-mono text-primary text-[11px]">locus_onboarded_&lt;userId&gt;</code>: Flags
                      whether you have finished the introductory walkthrough on this device.
                    </li>
                    <li>
                      <code className="font-mono text-primary text-[11px]">locus_pwa_banner_dismissed</code>: Remembers
                      whether you dismissed the mobile installation banner.
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded border border-border bg-surface-1 space-y-1">
                  <span className="font-bold text-foreground font-mono">Third-Party Embedded Player Cookies:</span>
                  <p className="text-muted-foreground">
                    When you play a video, YouTube&apos;s embedded player iframe may set cookies from Google domains (e.g.,{" "}
                    <code className="font-mono text-[11px]">youtube.com</code>, <code className="font-mono text-[11px]">google.com</code>)
                    to track bandwidth, remember player volume, and enforce Google terms. These are governed by Google&apos;s
                    Privacy Policy.
                  </p>
                </div>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 8: Transactional Email Communications */}
            <section id="email-communications" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 08
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  8. Transactional Email Communications
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Locus dispatches emails strictly for critical account operations using standard Nodemailer SMTP. In our
                production infrastructure, emails are routed through <strong>Brevo (Sendinblue SAS)</strong>.
              </p>
              <div className="p-4 rounded-lg border-2 border-border-strong bg-surface-1 space-y-2 text-xs sm:text-sm">
                <span className="font-bold text-foreground">Permitted Email Types:</span>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>
                    <strong>Account Verification:</strong> An email containing a secure link to verify ownership of your
                    email address upon initial registration.
                  </li>
                  <li>
                    <strong>Password Reset:</strong> An email containing a single-use time-limited token to reset your
                    password if requested.
                  </li>
                </ul>
                <p className="text-muted-foreground pt-1 border-t border-border">
                  <strong>Zero Marketing Emails:</strong> Locus does not send marketing newsletters, promotional blasts,
                  or third-party promotional material. You will never receive unsolicited marketing emails from Locus.
                </p>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 9: Third-Party Service Providers */}
            <section id="third-party-services" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 09
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  9. Third-Party Service Providers &amp; Processors
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                To provide a reliable, high-performance service, Locus partners with reputable cloud infrastructure and
                service providers. All processors are bound by strict data protection agreements:
              </p>

              <div className="overflow-x-auto border-2 border-border-strong rounded-lg bg-surface-1 shadow-brutal-sm">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-surface-2 border-b-2 border-border-strong font-mono text-[11px] uppercase tracking-wider text-foreground">
                    <tr>
                      <th className="p-3 border-r border-border">Service Provider</th>
                      <th className="p-3 border-r border-border">Role / Service</th>
                      <th className="p-3 border-r border-border">Location</th>
                      <th className="p-3">Privacy Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">Neon (Neon, Inc.)</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        Serverless PostgreSQL database hosting our user data, encrypted tokens, and video catalogs.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">AWS Singapore (<code className="font-mono text-[11px]">ap-southeast-1</code>)</td>
                      <td className="p-3">
                        <a href="https://neon.tech/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          neon.tech/privacy
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">Render (Render Services, Inc.)</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        Backend API server hosting and background synchronization tasks.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">United States / Global</td>
                      <td className="p-3">
                        <a href="https://render.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          render.com/privacy
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">Google LLC / YouTube</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        OAuth authentication, YouTube Data API v3 metadata queries, and IFrame video player.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">Global</td>
                      <td className="p-3">
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          policies.google.com
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">GitHub, Inc. (Microsoft)</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        Optional developer OAuth social sign-in.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">United States</td>
                      <td className="p-3">
                        <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          github.com/privacy
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">Brevo (Sendinblue SAS)</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        SMTP relay service for transactional verification and password-reset emails.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">European Union / France</td>
                      <td className="p-3">
                        <a href="https://www.brevo.com/en/legal/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          brevo.com/privacy
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-foreground border-r border-border">OpenAI, L.L.C.</td>
                      <td className="p-3 border-r border-border text-muted-foreground">
                        Batch LLM topic classification of public YouTube video titles/descriptions only.
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground">United States</td>
                      <td className="p-3">
                        <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          openai.com/privacy
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 10: Data Retention & Deletion (Implementation Gap Flagged) */}
            <section id="retention-deletion" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 10
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  10. Data Retention, Cascading Deletion &amp; Implementation Gap
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                We retain your account details, notes, preferences, and YouTube connection data for as long as your
                account is active.
              </p>

              <div className="p-4 rounded-md border border-border bg-surface-1 space-y-2 text-xs sm:text-sm">
                <span className="font-bold text-foreground">Database Cascade Architecture:</span>
                <p className="text-muted-foreground">
                  Our PostgreSQL database is architected with strict foreign key constraints. All user-specific tables (
                  <code className="font-mono text-xs">session</code>, <code className="font-mono text-xs">account</code>,{" "}
                  <code className="font-mono text-xs">integrations</code>, <code className="font-mono text-xs">user_preferences</code>,{" "}
                  <code className="font-mono text-xs">video_library</code>, <code className="font-mono text-xs">video_notes</code>,{" "}
                  <code className="font-mono text-xs">source_subscriptions</code>, and <code className="font-mono text-xs">user_topics</code>
                  ) have <code className="font-mono text-xs text-primary font-bold">ON DELETE CASCADE</code> rules linked to the
                  primary user account. When a user account is deleted, all personal records, notes, session keys, and encrypted
                  tokens are permanently eradicated.
                </p>
              </div>

              {/* CRITICAL TRANSPARENCY NOTICE // IMPLEMENTATION GAP */}
              <div className="p-5 sm:p-6 rounded-lg border-2 border-destructive bg-destructive/5 shadow-brutal space-y-3">
                <div className="flex items-center gap-2 text-destructive font-bold text-sm sm:text-base">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Transparency Notice // Implementation Gap: Account Deletion Workflow</span>
                </div>
                <div className="text-xs sm:text-sm text-foreground space-y-2 leading-relaxed">
                  <p>
                    <strong>Please Note:</strong> Locus currently <strong>does not have a self-service &quot;Delete Account&quot;
                    button or automated deletion endpoint</strong> in the user settings UI.
                  </p>
                  <p className="text-muted-foreground">
                    While the underlying database cascade is fully implemented, building a self-service account deletion UI
                    is currently on our active engineering roadmap. In the interim, to permanently delete your account and all
                    associated data, you must submit a manual deletion request by emailing{" "}
                    <a
                      href="mailto:privacy@locus.dev"
                      className="font-bold text-primary underline underline-offset-2"
                    >
                      [PRIVACY CONTACT EMAIL]
                    </a>
                    .
                  </p>
                  <p className="text-muted-foreground">
                    Upon identity confirmation, our administrative team will purge your primary user record within 30 days,
                    automatically triggering the database cascade deletion of all your personal data.
                  </p>
                </div>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 11: Disconnecting & Revoking Access (Implementation Gap Flagged) */}
            <section id="disconnecting-revoking" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 11
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  11. Disconnecting Accounts &amp; Revoking Permissions
                </h2>
              </div>

              {/* CRITICAL TRANSPARENCY NOTICE // IMPLEMENTATION GAP */}
              <div className="p-5 sm:p-6 rounded-lg border-2 border-destructive bg-destructive/5 shadow-brutal space-y-3">
                <div className="flex items-center gap-2 text-destructive font-bold text-sm sm:text-base">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Transparency Notice // Implementation Gap: In-App YouTube Disconnect</span>
                </div>
                <div className="text-xs sm:text-sm text-foreground space-y-2 leading-relaxed">
                  <p>
                    <strong>Please Note:</strong> Locus currently <strong>does not have an in-app &quot;Disconnect YouTube&quot;
                    button or automated token revocation endpoint</strong> in the Settings interface.
                  </p>
                  <p className="text-muted-foreground">
                    Although our database supports a <code className="font-mono text-xs">&apos;disconnected&apos;</code> /{" "}
                    <code className="font-mono text-xs">&apos;revoked&apos;</code> integration status enum, a one-click in-app
                    disconnect button is currently an unfulfilled capability undergoing development.
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-lg border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-foreground">
                  <ExternalLink className="w-4 h-4 text-primary" />
                  <span>How to Revoke Locus&apos;s Access Right Now via Google Security Settings</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  You can immediately revoke Locus&apos;s access to your Google and YouTube data at any time directly through
                  Google&apos;s centralized permissions manager:
                </p>
                <div className="p-3 rounded bg-surface-2 border border-border">
                  <ol className="list-decimal list-inside text-xs sm:text-sm text-foreground space-y-1.5 font-sans">
                    <li>
                      Visit your Google Account Permissions portal:{" "}
                      <a
                        href="https://myaccount.google.com/permissions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-bold underline underline-offset-2 inline-flex items-center gap-1"
                      >
                        https://myaccount.google.com/permissions
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>Locate <strong>Locus</strong> in the list of third-party apps with account access.</li>
                    <li>Click <strong>&quot;Remove Access&quot;</strong> or <strong>&quot;Revoke&quot;</strong>.</li>
                  </ol>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Once revoked via Google, Google immediately invalidates our refresh token. The next time Locus attempts to
                  synchronize channel data or refresh an access token, Google rejects the request, and Locus automatically
                  flags your integration status as <code className="font-mono text-xs">&apos;expired&apos;</code> /{" "}
                  <code className="font-mono text-xs">&apos;revoked&apos;</code>.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  To request complete manual deletion of the stored encrypted token records from our database prior to the
                  release of our in-app disconnect tool, please email{" "}
                  <a href="mailto:privacy@locus.dev" className="text-primary font-bold underline">
                    [PRIVACY CONTACT EMAIL]
                  </a>
                  .
                </p>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 12: Security Practices & Limitations */}
            <section id="security-practices" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 12
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  12. Security Architecture &amp; Inherent Limitations
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                We take security seriously and implement defense-in-depth engineering practices to safeguard your data:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-4 rounded-lg border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Lock className="w-4 h-4 text-primary" />
                    <span>AES-256-GCM Token Encryption</span>
                  </div>
                  <p className="text-muted-foreground">
                    All YouTube OAuth access tokens and refresh tokens are encrypted at rest using AES-256-GCM authenticated
                    encryption with a 256-bit secret key before database insertion. Payloads carry authenticated IVs and tags.
                  </p>
                </div>

                <div className="p-4 rounded-lg border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <span>Password Hashing &amp; Session Hygiene</span>
                  </div>
                  <p className="text-muted-foreground">
                    Passwords are cryptographically salted and hashed by Better Auth before reaching database disks. Plaintext
                    passwords are never logged or stored. Session tokens are unique cryptographically generated strings.
                  </p>
                </div>

                <div className="p-4 rounded-lg border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Transport Layer Security (TLS/HTTPS)</span>
                  </div>
                  <p className="text-muted-foreground">
                    All data in transit between your browser, our API backend on Render, and our Neon database is encrypted
                    using modern TLS 1.3/1.2 protocols with strict SSL mode required.
                  </p>
                </div>

                <div className="p-4 rounded-lg border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Database className="w-4 h-4 text-primary" />
                    <span>Injection &amp; CSRF Defense</span>
                  </div>
                  <p className="text-muted-foreground">
                    Database queries use strict parameterization through Drizzle ORM to eliminate SQL injection risks. OAuth
                    handshakes utilize single-use cryptographically random state tokens to thwart CSRF and replay attacks.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-md border border-border bg-surface-2 text-xs sm:text-sm text-muted-foreground space-y-1">
                <span className="font-bold text-foreground">Limitations of Security:</span>
                <p>
                  While we implement rigorous, industry-recognized controls, no electronic transmission over the internet
                  or digital storage architecture can be guaranteed 100% impenetrable. We cannot guarantee absolute security
                  against unforeseen zero-day vulnerabilities or sophisticated intrusions.
                </p>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 13: International Data Transfers */}
            <section id="international-transfers" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 13
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  13. International Data Processing &amp; Transfers
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Locus operates globally. Depending on your physical location, your personal information may be transferred
                to, stored, and processed in jurisdictions other than your country of residence:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-muted-foreground space-y-1.5 pl-2">
                <li>
                  <strong className="text-foreground">Primary Database:</strong> Hosted in AWS Asia Pacific (Singapore)
                  region (<code className="font-mono text-xs">ap-southeast-1</code>) via Neon.
                </li>
                <li>
                  <strong className="text-foreground">Application Servers:</strong> Hosted across Render cloud facilities in
                  the United States and the European Union.
                </li>
                <li>
                  <strong className="text-foreground">Third-Party Partners:</strong> Google, GitHub, and OpenAI maintain
                  distributed global cloud servers primarily centered in the United States.
                </li>
              </ul>
              <p className="text-xs sm:text-sm text-muted-foreground">
                If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, please be aware that
                data protection laws in these transfer destinations may differ from those in your jurisdiction. Where
                required, transfers are executed under standard contractual clauses or recognized adequacy frameworks.
              </p>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 14: Children's Privacy */}
            <section id="childrens-privacy" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 14
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">14. Children&apos;s Privacy</h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Locus is a technical learning and productivity application intended for software engineers, university
                students, and adult professionals. It is not directed at or designed to attract children under the age of 13
                (or 16 within the European Economic Area).
              </p>
              <p className="text-sm sm:text-base text-muted-foreground">
                We do not knowingly solicit or collect personal information from children. If you believe that a child has
                provided us with personal data without parental or guardian consent, please notify us immediately at{" "}
                <a href="mailto:privacy@locus.dev" className="text-primary font-bold underline">
                  [PRIVACY CONTACT EMAIL]
                </a>
                . Upon verification, we will promptly delete the data and terminate the account.
              </p>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 15: Your Privacy Rights & How to Exercise Them */}
            <section id="privacy-rights" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 15
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  15. Your Privacy Rights &amp; How to Exercise Them
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Under privacy regulations such as the General Data Protection Regulation (GDPR), the California Consumer
                Privacy Act (CCPA/CPRA), and equivalent state and national frameworks, you have significant rights regarding
                your personal data:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded border border-border bg-surface-1">
                  <span className="font-bold text-foreground block mb-0.5">Right to Access / Know</span>
                  <span className="text-muted-foreground">
                    Request confirmation of whether we process your data and receive a copy of all collected elements.
                  </span>
                </div>

                <div className="p-3.5 rounded border border-border bg-surface-1">
                  <span className="font-bold text-foreground block mb-0.5">Right to Rectification</span>
                  <span className="text-muted-foreground">
                    Request corrections to inaccurate or incomplete personal records in your account profile.
                  </span>
                </div>

                <div className="p-3.5 rounded border border-border bg-surface-1">
                  <span className="font-bold text-foreground block mb-0.5">Right to Erasure (&quot;Forgotten&quot;)</span>
                  <span className="text-muted-foreground">
                    Request that we permanently purge your user profile, notes, and integration tokens.
                  </span>
                </div>

                <div className="p-3.5 rounded border border-border bg-surface-1">
                  <span className="font-bold text-foreground block mb-0.5">Right to Data Portability</span>
                  <span className="text-muted-foreground">
                    Receive your personal notes and followed sources in a structured, machine-readable format.
                  </span>
                </div>

                <div className="p-3.5 rounded border border-border bg-surface-1">
                  <span className="font-bold text-foreground block mb-0.5">Right to Restrict or Object</span>
                  <span className="text-muted-foreground">
                    Restrict the processing of your data or object to processing based on legitimate interests.
                  </span>
                </div>

                <div className="p-3.5 rounded border border-border bg-surface-1">
                  <span className="font-bold text-foreground block mb-0.5">Right to Withdraw Consent</span>
                  <span className="text-muted-foreground">
                    Withdraw previously granted consent at any time without affecting the lawfulness of prior processing.
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-md border-2 border-border-strong bg-surface-2 space-y-2 text-xs sm:text-sm">
                <span className="font-bold text-foreground">How to Submit a Request:</span>
                <p className="text-muted-foreground">
                  Because automated self-service export and deletion portals are currently under development, please email
                  your formal privacy requests to:
                </p>
                <div className="font-mono text-xs font-bold text-primary p-2 rounded bg-surface-1 border border-border inline-block">
                  [PRIVACY CONTACT EMAIL] (Subject: Privacy Rights Request)
                </div>
                <p className="text-muted-foreground">
                  To protect your account security, we may request verification of your identity before completing the
                  request. We respond to all legitimate requests without undue delay and within 30 days (or within timelines
                  mandated by applicable jurisdiction).
                </p>
              </div>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 16: Changes to this Policy */}
            <section id="policy-changes" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 16
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">16. Changes to this Policy</h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                We may periodically update this Privacy Policy to reflect enhancements in Locus&apos;s feature set, shifts in
                our cloud architecture, new regulatory mandates, or changes in third-party API requirements.
              </p>
              <p className="text-sm sm:text-base text-muted-foreground">
                When changes are published, we will update the &quot;Last Updated&quot; date at the top and bottom of this
                document. For significant material alterations, we will provide prominent notice through an in-app banner or
                direct communication prior to the changes taking effect. Continued use of Locus following such notice
                constitutes your acknowledgment of the updated terms.
              </p>
            </section>

            <Separator className="bg-border-strong/40" />

            {/* Section 17: Contact & Legal Entity Details */}
            <section id="contact-information" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono">
                  SECTION 17
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  17. Contact &amp; Legal Entity Information
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                If you have questions, concerns, or feedback regarding this Privacy Policy, our data practices, or your
                dealings with Locus, please reach out through our designated contact channels:
              </p>

              {/* Legal Review Placeholder Card */}
              <div className="p-5 sm:p-6 rounded-lg border-2 border-border-strong bg-surface-1 shadow-brutal space-y-3 font-mono text-xs sm:text-sm">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="font-bold text-foreground uppercase tracking-wider font-sans">
                    Legal &amp; Privacy Representative
                  </span>
                  <Badge variant="secondary" className="text-[10px] border border-border">
                    LEGAL REVIEW PENDING
                  </Badge>
                </div>

                <div className="space-y-2 text-muted-foreground font-sans">
                  <div>
                    <span className="font-bold text-foreground font-mono block text-xs">Operator Entity:</span>
                    <span>[LEGAL ENTITY NAME / OPERATOR NAME]</span>
                  </div>
                  <div>
                    <span className="font-bold text-foreground font-mono block text-xs">Registered Address:</span>
                    <span>[REGISTERED / MAILING ADDRESS]</span>
                  </div>
                  <div>
                    <span className="font-bold text-foreground font-mono block text-xs">Privacy Officer Email:</span>
                    <a
                      href="mailto:privacy@locus.dev"
                      className="text-primary font-mono font-bold hover:underline"
                    >
                      [PRIVACY CONTACT EMAIL] (e.g. privacy@locus.dev)
                    </a>
                  </div>
                  <div>
                    <span className="font-bold text-foreground font-mono block text-xs">Governing Jurisdiction:</span>
                    <span>[GOVERNING JURISDICTION / APPLICABLE STATE OR COUNTRY]</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Navigation & Print Utility */}
            <div className="pt-8 border-t-2 border-border-strong flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-primary hover:underline"
              >
                <span>&larr; Back to Distraction-Free Feed</span>
              </Link>
              <div className="text-xs font-mono text-muted-foreground">
                Document: Locus Privacy Policy • Ref: LOCUS-PRIVACY-2026-V1
              </div>
            </div>
          </main>
        </div>
      </div>
    </AppShell>
  );
}
