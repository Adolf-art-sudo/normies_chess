import { z } from "zod";

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const tokenIdSchema = z.number().int().min(0).max(9999);
export const squareSchema = z.string().regex(/^[a-h][1-8]$/);

export const normieIdsSchema = z
  .array(tokenIdSchema)
  .length(16)
  .refine((ids) => new Set(ids).size === ids.length, "Normie IDs must be unique");

export function normalizeAddress(address: string) {
  return address.toLowerCase();
}

export function stripHtml(input: string, max = 200) {
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function parseJsonBody<T>(schema: z.ZodType<T>, body: unknown): T {
  return schema.parse(body);
}

export function safeLimit(value: string | null, max = 100, fallback = 25) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function safeOffset(value: string | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 100000);
}
