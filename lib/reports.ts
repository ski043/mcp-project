import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  type LucideIcon,
} from "lucide-react";

// Constants
export const SUMMARY_PREVIEW_LENGTH = 200;

export const OUTPUT_CHANNELS = [
  { id: "dashboard", label: "Dashboard", description: "View in app" },
  { id: "notion", label: "Notion", description: "Export to Notion" },
  { id: "docs", label: "Google Docs", description: "Export to Google Docs" },
] as const;

export const PUBLISH_CHANNELS = OUTPUT_CHANNELS.filter(
  (channel) => channel.id !== "dashboard"
);

export type OutputChannel = (typeof OUTPUT_CHANNELS)[number]["id"];
export type PublishChannel = (typeof PUBLISH_CHANNELS)[number]["id"];

// Sentiment configuration
type SentimentConfig = {
  label: string;
  icon: LucideIcon;
  className: string;
};

export function getSentimentConfig(sentiment: string | null): SentimentConfig {
  switch (sentiment) {
    case "bullish":
      return {
        label: "Bullish",
        icon: TrendingUpIcon,
        className:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      };
    case "bearish":
      return {
        label: "Bearish",
        icon: TrendingDownIcon,
        className:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      };
    default:
      return {
        label: "Neutral",
        icon: MinusIcon,
        className:
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      };
  }
}

// Output status badge variant
export function getOutputStatusBadge(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "sent":
      return "default";
    case "pending":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

// Group reports by date
type ReportWithDate = { createdAt: Date };

export function groupReportsByDate<T extends ReportWithDate>(reports: T[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: { title: string; reports: T[] }[] = [
    { title: "Today", reports: [] },
    { title: "Last 7 Days", reports: [] },
    { title: "Last 30 Days", reports: [] },
    { title: "Older", reports: [] },
  ];

  reports.forEach((report) => {
    const reportDate = new Date(report.createdAt);
    reportDate.setHours(0, 0, 0, 0);

    if (reportDate.getTime() === today.getTime()) {
      groups[0].reports.push(report);
    } else if (reportDate >= sevenDaysAgo) {
      groups[1].reports.push(report);
    } else if (reportDate >= thirtyDaysAgo) {
      groups[2].reports.push(report);
    } else {
      groups[3].reports.push(report);
    }
  });

  return groups.filter((group) => group.reports.length > 0);
}

// Extract title from markdown (first H1) or generate fallback
export function extractReportTitle(
  summary: string,
  createdAt: Date
): string {
  // Try to find first H1 heading
  const h1Match = summary.match(/^#\s+(.+?)(?:\n|$)/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Fallback to date-based title
  const date = new Date(createdAt);
  return `Portfolio Report - ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

// Remove the first H1 from markdown (used when title is shown separately)
export function stripFirstH1(text: string): string {
  return text.replace(/^#\s+.+?\n+/, "").trim();
}

// Strip markdown syntax for clean preview text
export function stripMarkdown(text: string): string {
  return (
    text
      // Remove headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      // Remove links but keep text
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`(.+?)`/g, "$1")
      // Remove bullet points
      .replace(/^[-*+]\s+/gm, "")
      // Remove numbered lists
      .replace(/^\d+\.\s+/gm, "")
      // Collapse whitespace
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}
