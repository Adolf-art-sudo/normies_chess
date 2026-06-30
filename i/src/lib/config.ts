export const NORMIES_API_BASE = "https://api.normies.art";

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || "";
}

export function siweDomain() {
  return process.env.SIWE_DOMAIN || "localhost:3000";
}

export const SESSION_TTL_HOURS = 24;
export const NONCE_TTL_MINUTES = 5;
export const GAME_TTL_HOURS = 24;
