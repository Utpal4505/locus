"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  ExternalLink,
  ArrowLeft,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  Clock,
  Lock,
  Download,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

export default function TermsPage() {
  const [activeSection, setActiveSection] = React.useState<string>("section-1");

  const sections = [
    { id: "section-1", title: "1. Acceptance of Terms" },
    { id: "section-2", title: "2. Eligibility & Accounts" },
    { id: "section-3", title: "3. Account Security" },
    { id: "section-4", title: "4. Description & Beta Status" },
    { id: "section-5", title: "5. Google & YouTube Integration" },
    { id: "section-6", title: "6. Third-Party Services" },
    { id: "section-7", title: "7. Ownership of Locus Software" },
    { id: "section-8", title: "8. YouTube Media Ownership" },
    { id: "section-9", title: "9. User Content & Personal Notes" },
    { id: "section-10", title: "10. Prohibited Uses & Abuse" },
    { id: "section-11", title: "11. Availability, Bugs & Changes" },
    { id: "section-12", title: "12. Termination & Data Deletion" },
    { id: "section-13", title: "13. Disclaimers & Liability Limits" },
    { id: "section-14", title: "14. Indemnification" },
    { id: "section-15", title: "15. Changes to These Terms" },
    { id: "section-16", title: "16. Governing Law & Disputes" },
    { id: "section-17", title: "17. Contact Information" },
  ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Feed</span>
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[11px] py-0.5">
              Effective: October 25, 2026
            </Badge>
            <Badge variant="accent" className="font-mono text-[11px] py-0.5">
              Public Beta
            </Badge>
          </div>
        </div>

        {/* Page Hero Header */}
        <header className="mb-10 pb-8 border-b-2 border-border-strong">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 border-2 border-primary text-primary flex items-center justify-center shadow-brutal-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                Terms of Service
              </h1>
              <p className="text-xs sm:text-sm font-mono text-muted-foreground mt-0.5">
                Clear, transparent terms governing your use of the Locus platform.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 text-xs font-mono">
            <div className="p-3 rounded-md bg-surface-2 border border-border">
              <span className="text-muted-foreground block text-[11px]">Last Updated</span>
              <span className="font-bold text-foreground">October 25, 2026</span>
            </div>
            <div className="p-3 rounded-md bg-surface-2 border border-border">
              <span className="text-muted-foreground block text-[11px]">Platform Stage</span>
              <span className="font-bold text-foreground">Active Development (Beta)</span>
            </div>
            <div className="p-3 rounded-md bg-surface-2 border border-border">
              <span className="text-muted-foreground block text-[11px]">YouTube API Compliance</span>
              <span className="font-bold text-primary">Read-Only / Embedded Player</span>
            </div>
          </div>
        </header>

        {/* Main Content Layout with Sticky Table of Contents */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Table of Contents Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-20 bg-surface-1 border-2 border-border-strong rounded-md p-4 shadow-brutal-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
              <span className="font-mono font-bold text-xs uppercase tracking-wider text-foreground">
                Table of Contents
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">17 Sections</span>
            </div>
            <nav aria-label="Terms of Service Table of Contents" className="space-y-1 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
              {sections.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setActiveSection(item.id)}
                  className={`block px-2.5 py-1.5 rounded text-xs font-mono transition-colors leading-tight ${
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  {item.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* Legal Text Sections */}
          <main className="lg:col-span-8 space-y-10 text-foreground leading-relaxed text-sm">
            {/* Quick Summary Card */}
            <div className="p-5 rounded-md bg-surface-1 border-2 border-border-strong shadow-brutal space-y-3">
              <div className="flex items-center gap-2 text-foreground font-bold font-mono text-xs uppercase tracking-wider">
                <Info className="w-4 h-4 text-primary" />
                <span>Summary for Humans</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Locus is an intentional learning platform created to let you organize, curate, and study YouTube technical content in a chronological, distraction-free environment without algorithm-driven recommendations.
              </p>
              <ul className="text-xs space-y-1.5 font-mono text-foreground/90 list-disc list-inside">
                <li>We do not host or own YouTube videos; videos stream directly via YouTube's official player.</li>
                <li>Your YouTube connection is strictly read-only; we never alter your YouTube account.</li>
                <li>Your personal video notes are yours; you can download them as Markdown anytime.</li>
                <li>Locus is in active beta: we do not guarantee 100% uptime, and features may change as we build.</li>
              </ul>
            </div>

            {/* SECTION 1 */}
            <section id="section-1" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 01
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Acceptance of the Terms
                </h2>
              </div>
              <p>
                These Terms of Service (&ldquo;Terms&rdquo;) constitute a binding legal agreement between you (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and the operators of Locus (&ldquo;Locus,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
              </p>
              <p>
                By creating an account, authenticating via Google or email, connecting a YouTube account, or otherwise browsing and using the Locus web application or progressive web application, you acknowledge that you have read, understood, and agree to be bound by these Terms and our companion Privacy Policy. If you do not agree to these Terms, you must not access or use Locus.
              </p>
              <div className="p-3 bg-secondary/50 rounded border border-border text-xs font-mono text-muted-foreground">
                <strong className="text-foreground">Review Flag:</strong> Operating entity details are currently designated under{" "}
                <span className="text-accent-foreground bg-accent/20 px-1 py-0.5 rounded font-bold">
                  [Placeholder: Legal Operating Entity / Project Owner Name]
                </span>{" "}
                pending formal incorporation confirmation.
              </div>
            </section>

            {/* SECTION 2 */}
            <section id="section-2" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 02
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Eligibility & Account Responsibilities
                </h2>
              </div>
              <p>
                You may use Locus only if you possess the legal capacity to form a binding contract under applicable law in your jurisdiction.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Minimum Age:</strong> Locus is not directed to children under 13 years of age (or the applicable minimum age for online services in your country, such as 16 in certain EU member states).{" "}
                  <span className="text-accent-foreground bg-accent/20 px-1 py-0.5 rounded font-bold">
                    [Decision for Review: Minimum age requirement (e.g., 13+, 16+, or legal age of majority in your jurisdiction)]
                  </span>
                  .
                </li>
                <li>
                  <strong className="text-foreground">Accurate Information:</strong> When registering via email or OAuth, you agree to provide accurate and current contact details (e.g., a valid email address) and maintain the accuracy of this information.
                </li>
                <li>
                  <strong className="text-foreground">Organizational Authority:</strong> If you use Locus on behalf of a company, school, or organization, you represent and warrant that you have the authority to bind that entity to these Terms.
                </li>
              </ul>
            </section>

            {/* SECTION 3 */}
            <section id="section-3" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 03
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Account Security & Unauthorized Use
                </h2>
              </div>
              <p>
                You are responsible for maintaining the confidentiality of your authentication credentials, including your email password and active session tokens.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Credential Safeguards:</strong> You must choose a strong password (minimum 8 characters) and refrain from sharing your login credentials with third parties.
                </li>
                <li>
                  <strong className="text-foreground">Prompt Notification:</strong> You agree to notify us immediately if you suspect or discover any unauthorized access to your account or any other breach of security.
                </li>
                <li>
                  <strong className="text-foreground">Responsibility for Activity:</strong> You are responsible for all activities that occur under your account prior to your notification to us of unauthorized use.
                </li>
              </ul>
            </section>

            {/* SECTION 4 */}
            <section id="section-4" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 04
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Description of Locus & Beta Status
                </h2>
              </div>
              <p>
                Locus is a focused web application designed to help learners and developers discover and consume technical YouTube videos in a structured, chronological feed without algorithmic recommendations, distractions, or manipulative engagement loops. The service includes chronological feed generation, personal video queues, favorites, watch progress tracking, timestamped markdown notes, and AI-assisted topic categorization.
              </p>
              <div className="p-4 rounded-md border-2 border-border-strong bg-accent/10 shadow-brutal-sm space-y-2">
                <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider text-accent-foreground">
                  <AlertTriangle className="w-4 h-4 text-accent" />
                  <span>Public Beta & Development Notice</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Locus is provided to you during an early development and beta stage. Features may undergo continuous modification, disruption, or refinement. We do not warrant that beta features will operate error-free, uninterrupted, or indefinitely. You acknowledge that you use beta software at your own risk.
                </p>
              </div>
            </section>

            {/* SECTION 5 */}
            <section id="section-5" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 05
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Google Account & YouTube Integration
                </h2>
              </div>
              <p>
                Locus provides optional integration with Google accounts and YouTube to allow you to import your followed channels and synchronize recent video uploads.
              </p>

              {/* YouTube Terms & Google Privacy Policy Mandatory Notice */}
              <div className="p-4 rounded-md border-2 border-border-strong bg-surface-2 shadow-brutal-sm space-y-3">
                <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider text-foreground">
                  <ExternalLink className="w-4 h-4 text-primary" />
                  <span>Mandatory YouTube & Google Compliance Terms</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Locus utilizes <strong>YouTube API Services</strong>. By connecting your YouTube account or accessing YouTube content through Locus, you explicitly acknowledge and agree that:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground font-mono">
                  <li>
                    You are bound by the{" "}
                    <a
                      href="https://www.youtube.com/t/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-bold underline inline-flex items-center gap-0.5"
                    >
                      YouTube Terms of Service
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    .
                  </li>
                  <li>
                    Your data is subject to the{" "}
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-bold underline inline-flex items-center gap-0.5"
                    >
                      Google Privacy Policy
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    .
                  </li>
                  <li>
                    You may revoke Locus&apos;s access to your YouTube data at any time via the{" "}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-bold underline inline-flex items-center gap-0.5"
                    >
                      Google Security Settings Page
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    .
                  </li>
                </ol>
              </div>

              <h3 className="text-base font-bold text-foreground pt-2">Scope of YouTube Access & Token Security</h3>
              <p>
                Locus requests only the read-only OAuth scope{" "}
                <code className="text-xs font-mono bg-surface-3 px-1.5 py-0.5 rounded border border-border">
                  https://www.googleapis.com/auth/youtube.readonly
                </code>
                . Locus accesses your public subscriptions and upload playlists solely to assemble your feed. Locus does not have permission to post videos, write comments, like or dislike media, modify playlists, or alter your YouTube profile.
              </p>
              <p>
                All OAuth access and refresh tokens returned by Google are encrypted at rest using AES-256-GCM application-layer encryption before being stored in the Locus database.
              </p>

              <h3 className="text-base font-bold text-foreground pt-2">Following Channels in Locus vs. YouTube Subscriptions</h3>
              <p>
                Importing your YouTube subscriptions allows you to selectively follow or unfollow creators inside Locus. Following or unfollowing a channel in Locus affects only your Locus feed and does <em>not</em> subscribe or unsubscribe your account on YouTube.
              </p>
            </section>

            {/* SECTION 6 */}
            <section id="section-6" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 06
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Third-Party Services, Content & External Links
                </h2>
              </div>
              <p>
                Locus interoperates with external third-party services and APIs to deliver features. These third-party services include:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-muted-foreground text-xs font-mono">
                <li><strong className="text-foreground font-sans">Google LLC & YouTube LLC:</strong> Account authentication, YouTube Data API v3, and YouTube IFrame Player API.</li>
                <li><strong className="text-foreground font-sans">OpenAI LLC:</strong> Natural language processing and automated taxonomy generation for technical video topics via OpenAI API.</li>
                <li><strong className="text-foreground font-sans">SMTP Infrastructure:</strong> Transactional email delivery for account verification and password reset workflows.</li>
              </ul>
              <p>
                Locus has no ownership or control over third-party terms, availability, quotas, or privacy practices. We are not responsible or liable for any downtime, quota restrictions, policy changes, or failures originating from external providers. Links to third-party websites or services are provided for reference only; inclusion does not imply endorsement by Locus.
              </p>
            </section>

            {/* SECTION 7 */}
            <section id="section-7" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 07
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Ownership of Locus Software & Branding
                </h2>
              </div>
              <p>
                All rights, title, and interest in and to the Locus software, interface designs, frontend code, backend services, brand name, trademarks, logos, domain names, and original documentation are and will remain the exclusive property of Locus and its contributors.
              </p>
              <p>
                Subject to your compliance with these Terms, Locus grants you a limited, non-exclusive, non-transferable, revocable license to access and use the platform for your personal, non-commercial educational use. You may not copy, modify, distribute, sell, or lease any part of our software or interfaces unless granted explicit written permission or authorized under open-source licenses governing specific repository components.
              </p>
            </section>

            {/* SECTION 8 */}
            <section id="section-8" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 08
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  YouTube Content Ownership & Third-Party Rights
                </h2>
              </div>
              <div className="p-4 rounded-md border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-2">
                <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider text-destructive">
                  <Shield className="w-4 h-4" />
                  <span>No Ownership of YouTube Media</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Locus does <strong>not</strong> own, produce, host, store, or license any YouTube videos, audio tracks, thumbnails, or creator descriptions displayed or indexed through the service.
                </p>
              </div>
              <p>
                All copyrights, trademarks, and intellectual property rights in third-party media remain with the respective content creators, copyright owners, or YouTube LLC.
              </p>
              <p>
                Videos displayed in Locus are streamed directly via the official YouTube IFrame Player API. Locus does not download video or audio files, strip advertisements, bypass YouTube paywalls or age gates, circumvent digital rights management (DRM), or store raw video streams on its servers.
              </p>
            </section>

            {/* SECTION 9 */}
            <section id="section-9" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 09
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  User-Generated Content & Personal Notes
                </h2>
              </div>
              <p>
                Locus allows you to compose private, timestamped Markdown notes associated with videos, organize items into learning queues, mark favorites, and submit in-app feedback (&ldquo;User Content&rdquo;).
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Ownership:</strong> You retain complete intellectual property ownership of the personal notes and text you compose in Locus.
                </li>
                <li>
                  <strong className="text-foreground">Service License:</strong> You grant Locus a limited, non-exclusive license to host, store, back up, and display your notes solely as necessary to operate the application and provide the workstation experience to you.
                </li>
                <li>
                  <strong className="text-foreground">Export Capability:</strong> You may export individual video notes at any time as downloadable Markdown (<code className="text-xs font-mono">.md</code>) files directly from the video player workstation.
                </li>
                <li>
                  <strong className="text-foreground">User Responsibility:</strong> You are solely responsible for the content of your notes. You agree not to store unlawful, infringing, libelous, or malicious code or material in your notes or feedback submissions.
                </li>
              </ul>
            </section>

            {/* SECTION 10 */}
            <section id="section-10" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 10
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Prohibited Use, Abuse & Disruption
                </h2>
              </div>
              <p>When using Locus, you agree not to engage in any of the following prohibited activities:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground text-xs sm:text-sm">
                <li>Attempting to probe, scan, bypass, or breach the security, authentication, or token encryption of Locus or connected databases.</li>
                <li>Interfering with, disrupting, or placing unreasonable load on Locus servers, networks, or connected API services (including denial-of-service attacks or quota exhaustion).</li>
                <li>Using automated bots, scrapers, crawlers, or harvesting tools to extract content, feeds, or user data without explicit permission.</li>
                <li>Circumventing YouTube Data API rate limits, backoff intervals, or YouTube terms of use.</li>
                <li>Using Locus to transmit spam, viruses, malware, or phishing attempts.</li>
                <li>Reverse-engineering, decompiling, or attempting to derive backend source code, except where such restriction is prohibited by applicable law.</li>
              </ul>
            </section>

            {/* SECTION 11 */}
            <section id="section-11" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 11
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Service Availability, Bugs, Changes & Discontinuation
                </h2>
              </div>
              <p>
                Locus is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis. We strive to provide a fast, reliable learning experience, but we do not guarantee that:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                <li>The service will be uninterrupted, timely, secure, or bug-free.</li>
                <li>YouTube API synchronization will capture every channel upload instantaneously or indefinitely.</li>
                <li>Data stored in Locus will never be lost, corrupted, or altered.</li>
              </ul>
              <p>
                We reserve the right to alter, update, suspend, or discontinue any feature, endpoint, or the entire service at any time, with or without prior notice, without liability to you.
              </p>
            </section>

            {/* SECTION 12 */}
            <section id="section-12" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 12
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Account Termination & Data Deletion
                </h2>
              </div>
              <p>
                You may discontinue using Locus at any time. You may revoke YouTube permissions via Google Security Settings whenever you wish.
              </p>

              {/* Verified Actual Capabilities Callout */}
              <div className="p-4 rounded-md border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-3">
                <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider text-foreground">
                  <Lock className="w-4 h-4 text-primary" />
                  <span>Current Account Deletion & Export Capabilities</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  In accordance with actual product implementation at this stage:
                </p>
                <ul className="text-xs space-y-2 text-muted-foreground font-mono">
                  <li>
                    <strong className="text-foreground font-sans">Self-Serve Note Export:</strong> You can download individual video notes as Markdown (<code className="text-xs font-mono">.md</code>) files from the watch screen. Bulk automated account data export is not currently implemented.
                  </li>
                  <li>
                    <strong className="text-foreground font-sans">Account Deletion Workflow:</strong> Locus currently does not provide an automated self-serve deletion button in the settings UI. To request complete deletion of your account and all associated database records (notes, preferences, subscriptions, and library records), you must email{" "}
                    <span className="text-accent-foreground bg-accent/20 px-1 py-0.5 rounded font-bold">
                      [Placeholder: Contact Email, e.g., support@locus.dev]
                    </span>
                    . Upon identity verification, an administrator will remove your user record, triggering database cascading deletion across all associated tables.
                  </li>
                  <li>
                    <strong className="text-foreground font-sans">YouTube Connection Disconnect:</strong> While YouTube OAuth permissions can be revoked at any time via your Google Account, a self-serve 1-click disconnect button inside Locus Settings is under active development.
                  </li>
                </ul>
              </div>

              <p>
                Locus reserves the right to suspend or terminate your account or access to the service at any time, with or without cause or notice, including for violations of these Terms or requests by law enforcement or regulatory authorities.
              </p>
            </section>

            {/* SECTION 13 */}
            <section id="section-13" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 13
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Disclaimers & Limitations of Liability
                </h2>
              </div>
              <div className="p-4 rounded-md border border-border bg-surface-2/60 space-y-2 uppercase text-xs font-mono leading-relaxed text-foreground/90">
                <p>
                  To the maximum extent permitted by applicable law, Locus and its contributors disclaim all warranties, express or implied, statutory or otherwise, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, non-infringement, and title.
                </p>
                <p>
                  In no event shall Locus, its developers, operators, or affiliates be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages (including damages for loss of profits, goodwill, data, or personal notes, or cost of substitute services) arising out of or in connection with these terms or your use of or inability to use Locus, regardless of the theory of liability.
                </p>
                <p>
                  To the maximum extent permitted by applicable law, Locus&apos;s total aggregate liability for all claims arising out of or relating to these terms or the service shall not exceed the amount you paid to Locus in the twelve (12) months preceding the event giving rise to liability, or fifty US dollars ($50.00), whichever is greater.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                <em>Jurisdiction Note:</em> Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability for certain damages. In such jurisdictions, our liability shall be limited to the greatest extent permitted by applicable law.
              </p>
            </section>

            {/* SECTION 14 */}
            <section id="section-14" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 14
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Indemnification
                </h2>
              </div>
              <p>
                You agree to defend, indemnify, and hold harmless Locus, its operators, contributors, and agents from and against any reasonable third-party claims, liabilities, damages, losses, and reasonable legal expenses arising directly out of:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                <li>Your willful breach of these Terms;</li>
                <li>Your User Content or notes;</li>
                <li>Your violation of any applicable law or regulation; or</li>
                <li>Your infringement of any third-party right, including intellectual property or privacy rights.</li>
              </ul>
            </section>

            {/* SECTION 15 */}
            <section id="section-15" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 15
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Changes to These Terms
                </h2>
              </div>
              <p>
                We may revise and update these Terms periodically as Locus evolves and as required by legal or API policy modifications.
              </p>
              <p>
                When changes are made, we will update the &ldquo;Last Updated&rdquo; date at the top of this document. If we make material modifications that adversely affect your rights, we will provide reasonable notice (such as an in-app banner or an email to your registered address) prior to the changes taking effect. Your continued use of Locus after the effective date of updated Terms constitutes your binding acceptance of the changes.
              </p>
            </section>

            {/* SECTION 16 */}
            <section id="section-16" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 16
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Governing Law & Dispute Resolution
                </h2>
              </div>
              <p>
                These Terms and any dispute arising out of or related to Locus shall be governed by and construed in accordance with the laws of{" "}
                <span className="text-accent-foreground bg-accent/20 px-1 py-0.5 rounded font-bold">
                  [Placeholder: Governing Jurisdiction / State / Country — to be confirmed by counsel]
                </span>
                , without regard to conflict of law principles.
              </p>
              <div className="p-3 bg-secondary/50 rounded border border-border text-xs font-mono text-muted-foreground space-y-2">
                <strong className="text-foreground block">Informal Dispute Resolution:</strong>
                <p>
                  Before initiating formal legal proceedings, you and Locus agree to attempt to resolve any dispute, claim, or controversy informally by sending a written notice of dispute to{" "}
                  <span className="text-accent-foreground bg-accent/20 px-1 py-0.5 rounded font-bold">
                    [Placeholder: Dispute Resolution Contact Email]
                  </span>
                  . Both parties agree to negotiate in good faith for at least thirty (30) days following receipt of notice.
                </p>
                <p>
                  <strong className="text-foreground">Forum Selection:</strong>{" "}
                  <span className="text-accent-foreground bg-accent/20 px-1 py-0.5 rounded font-bold">
                    [Placeholder: Forum / Venue / Arbitration specifications pending user legal confirmation]
                  </span>
                  .
                </p>
              </div>
            </section>

            {/* SECTION 17 */}
            <section id="section-17" className="scroll-mt-24 space-y-3 pb-8">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  SECTION 17
                </Badge>
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Contact Information
                </h2>
              </div>
              <p>
                If you have questions, feedback, or legal inquiries concerning these Terms of Service or wish to submit an account deletion request, please reach out via:
              </p>
              <div className="p-4 rounded-md border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-2 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Legal Contact Email:</span>
                  <span className="font-bold text-primary">
                    [Placeholder: legal@locus.dev or support@locus.dev]
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">In-App Feedback:</span>
                  <span>Use the &ldquo;Report Bug / Send Feedback&rdquo; button in the site navigation.</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Operating Entity:</span>
                  <span>[Placeholder: Legal Entity Name, Organization Address, Country]</span>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </AppShell>
  );
}
