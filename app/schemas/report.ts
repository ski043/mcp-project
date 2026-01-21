import { z } from "zod";

// Base schema for report generation options
const reportOptionsSchema = z.object({
  model: z.string().optional(),
  outputChannels: z
    .array(z.enum(["dashboard", "notion", "docs"]))
    .default(["dashboard"]),
});

export const generateReportSchema = reportOptionsSchema;

// Initiate report - creates placeholder and returns ID
export const initiateReportSchema = reportOptionsSchema;

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
