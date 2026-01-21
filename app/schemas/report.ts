import { z } from "zod";

export const generateReportSchema = z.object({
  model: z.string().optional(),
  outputChannels: z
    .array(z.enum(["dashboard", "notion", "docs"]))
    .default(["dashboard"]),
});

// New: Initiate report - creates placeholder and returns ID
export const initiateReportSchema = z.object({
  model: z.string().optional(),
  outputChannels: z
    .array(z.enum(["dashboard", "notion", "docs"]))
    .default(["dashboard"]),
});

// New: Stream report - streams AI content for a generating report
export const streamReportSchema = z.object({
  reportId: z.uuid(),
});

export const getReportSchema = z.object({
  reportId: z.uuid(),
});

export const deleteReportSchema = z.object({
  reportId: z.uuid(),
});

export const publishReportSchema = z.object({
  reportId: z.uuid(),
  channel: z.enum(["notion", "docs"]),
  waitForAuth: z.boolean().default(false),
});
