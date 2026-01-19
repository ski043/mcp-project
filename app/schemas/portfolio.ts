import { z } from "zod";

export const createPortfolioSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().min(1, "Description is required").max(500, "Description is too long"),
  isDemo: z.boolean(),
});

export const updatePortfolioSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().min(1, "Description is required").max(500, "Description is too long"),
});

export const addHoldingSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").max(10, "Ticker is too long").toUpperCase(),
  quantity: z.number().positive("Quantity must be positive"),
  purchasePrice: z.number().positive("Purchase price must be positive"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
});

export const removeHoldingSchema = z.object({
  holdingId: z.uuid("Invalid holding ID"),
});

export const getHoldingDetailsSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").toUpperCase(),
});
