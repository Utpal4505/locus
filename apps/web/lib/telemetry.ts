"use client";

export interface ConsoleEntry {
  timestamp: string;
  level: "error" | "warn";
  message: string;
  stack?: string;
}

export interface TelemetryPayload {
  timestamp: string;
  timezone: string;
  url: string;
  pathname: string;
  search: string;
  previousUrl: string | null;
  routeHistory: string[];
  device: {
    os: string;
    browser: string;
    viewport: string;
    screenResolution: string;
    dpr: number;
    isOnline: boolean;
    language: string;
  };
  appContext?: Record<string, unknown>;
  consoleErrors: ConsoleEntry[];
}

const MAX_CONSOLE_BUFFER = 15;
const MAX_ROUTE_HISTORY = 6;

const consoleBuffer: ConsoleEntry[] = [];
let routeHistory: string[] = [];
let isInitialized = false;

/**
 * Sanitizes messages to remove potential passwords, tokens, or sensitive cookies.
 */
function sanitizeMessage(msg: unknown): string {
  if (typeof msg !== "string") {
    try {
      msg = JSON.stringify(msg);
    } catch {
      msg = String(msg);
    }
  }

  return (msg as string)
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]")
    .replace(/(password|secret|token|api_?key)["']?\s*[:=]\s*["']?[^"'\s&]+/gi, "$1=[REDACTED]");
}

/**
 * Initializes listeners for console errors, unhandled rejections, and window errors.
 * Safe to call multiple times in SSR/CSR.
 */
export function initTelemetryCollector() {
  if (typeof window === "undefined" || isInitialized) {
    return;
  }

  isInitialized = true;

  // Intercept console.error
  const originalError = console.error;
  console.error = function (...args: unknown[]) {
    try {
      const sanitized = args.map(sanitizeMessage).join(" ");
      const entry: ConsoleEntry = {
        timestamp: new Date().toISOString(),
        level: "error",
        message: sanitized.slice(0, 500),
      };
      if (consoleBuffer.length >= MAX_CONSOLE_BUFFER) {
        consoleBuffer.shift();
      }
      consoleBuffer.push(entry);
    } catch {
      // Safe fallback
    }
    originalError.apply(console, args);
  };

  // Intercept window uncaught errors
  window.addEventListener("error", (event) => {
    try {
      const entry: ConsoleEntry = {
        timestamp: new Date().toISOString(),
        level: "error",
        message: sanitizeMessage(event.message || "Uncaught Error"),
        stack: event.error?.stack ? String(event.error.stack).slice(0, 1000) : undefined,
      };
      if (consoleBuffer.length >= MAX_CONSOLE_BUFFER) {
        consoleBuffer.shift();
      }
      consoleBuffer.push(entry);
    } catch {
      // Safe fallback
    }
  });

  // Intercept unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    try {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const entry: ConsoleEntry = {
        timestamp: new Date().toISOString(),
        level: "error",
        message: `Unhandled Promise: ${sanitizeMessage(message)}`,
        stack: reason?.stack ? String(reason.stack).slice(0, 1000) : undefined,
      };
      if (consoleBuffer.length >= MAX_CONSOLE_BUFFER) {
        consoleBuffer.shift();
      }
      consoleBuffer.push(entry);
    } catch {
      // Safe fallback
    }
  });
}

/**
 * Records a navigation path in session breadcrumbs.
 */
export function recordRouteBreadcrumb(path: string) {
  if (typeof window === "undefined" || !path) return;

  const currentLast = routeHistory[routeHistory.length - 1];
  if (currentLast === path) return;

  routeHistory.push(path);
  if (routeHistory.length > MAX_ROUTE_HISTORY) {
    routeHistory.shift();
  }
}

/**
 * Resolves human-friendly OS from user agent.
 */
function detectOS(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os x/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown OS";
}

/**
 * Resolves human-friendly Browser name and version.
 */
function detectBrowser(ua: string): string {
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/opr|opera/i.test(ua)) return "Opera";
  return "Browser";
}

/**
 * Assembles complete diagnostic telemetry object.
 */
export function collectDiagnostics(appContext?: Record<string, unknown>): TelemetryPayload {
  if (typeof window === "undefined") {
    return {
      timestamp: new Date().toISOString(),
      timezone: "UTC",
      url: "",
      pathname: "",
      search: "",
      previousUrl: null,
      routeHistory: [],
      device: {
        os: "Unknown",
        browser: "Unknown",
        viewport: "0x0",
        screenResolution: "0x0",
        dpr: 1,
        isOnline: true,
        language: "en",
      },
      consoleErrors: [],
    };
  }

  const ua = navigator.userAgent;
  const prevUrl = routeHistory.length >= 2 ? routeHistory[routeHistory.length - 2]! : null;

  let tz = "UTC";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // fallback
  }

  return {
    timestamp: new Date().toISOString(),
    timezone: tz,
    url: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    previousUrl: prevUrl,
    routeHistory: [...routeHistory],
    device: {
      os: detectOS(ua),
      browser: detectBrowser(ua),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screenResolution: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
      dpr: window.devicePixelRatio || 1,
      isOnline: navigator.onLine,
      language: navigator.language || "en",
    },
    appContext,
    consoleErrors: [...consoleBuffer],
  };
}

