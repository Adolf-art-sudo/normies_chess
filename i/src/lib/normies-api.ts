import { sql, initDb } from "@/lib/db";
import { NORMIES_API_BASE } from "@/lib/config";
import { takeRateSlot } from "@/lib/rate-limit";
import { normalizeAddress } from "@/lib/validators";

export type NormieTraits = Record<string, string>;

export type PieceData = {
  tokenId: number;
  traits: NormieTraits;
  piece: "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
  isZombie: boolean;
  isAgent: boolean;
  isLegendary: boolean;
  rarityRank: number | null;
  personaName: string | null;
};

const jsonTtls: Record<string, number> = {
  bulkTraits: 24 * 60 * 60,
  metadata: 60,
  traits: 24 * 60 * 60,
  rarity: 60,
  zombie: 60,
  agent: 60,
  legendary: 60,
  holder: 10,
  svg: 300
};

async function cachedJson<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>) {
  await initDb();
  const cached = await sql<{ payload: T; status: number }>`
    SELECT payload, status FROM api_cache
    WHERE cache_key = ${key} AND expires_at > NOW()
    LIMIT 1
  `;
  if (cached.rows[0]) return cached.rows[0].payload;
  const payload = await fetcher();
  await sql`
    INSERT INTO api_cache(cache_key, payload, expires_at)
    VALUES (${key}, ${JSON.stringify(payload)}::jsonb, NOW() + (${ttlSeconds} || ' seconds')::interval)
    ON CONFLICT(cache_key)
    DO UPDATE SET payload = EXCLUDED.payload, text_payload = NULL, status = 200, expires_at = EXCLUDED.expires_at, created_at = NOW()
  `;
  return payload;
}

async function fetchNormies(path: string) {
  const slot = await takeRateSlot("normies-upstream", 50, 60);
  if (!slot.allowed) {
    const err = new Error("Normies API safety limit reached. Please retry shortly.");
    (err as Error & { status?: number }).status = 429;
    throw err;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(`${NORMIES_API_BASE}${path}`, {
      signal: controller.signal,
      headers: { "User-Agent": "normies-chess/1.0" }
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getHolderTokens(address: string) {
  const normalized = normalizeAddress(address);
  return cachedJson<number[]>(`holder:${normalized}`, jsonTtls.holder, async () => {
    const res = await fetchNormies(`/holders/${normalized}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data.map(Number).filter((id) => Number.isInteger(id));
    if (Array.isArray(data.tokenIds)) return data.tokenIds.map(Number).filter((id: number) => Number.isInteger(id));
    if (Array.isArray(data.tokens)) return data.tokens.map(Number).filter((id: number) => Number.isInteger(id));
    return [];
  });
}

async function getBulkTraitsMap() {
  return cachedJson<Record<string, NormieTraits>>("bulk:original-traits", jsonTtls.bulkTraits, async () => {
    const res = await fetchNormies("/normie/all/original/traits");
    if (!res.ok) return {};
    const data = await res.json();
    const map: Record<string, NormieTraits> = {};
    const rows = Array.isArray(data) ? data : Array.isArray(data.tokens) ? data.tokens : Array.isArray(data.rows) ? data.rows : [];
    for (const row of rows) {
      const tokenId = row?.tokenId ?? row?.id ?? row?.token_id;
      if (tokenId === undefined) continue;
      map[String(Number(tokenId))] = normalizeTraits(row?.traits ?? row?.attributes ?? row);
    }
    return map;
  });
}

function normalizeTraits(data: unknown): NormieTraits {
  const traits: NormieTraits = {};
  if (Array.isArray(data)) {
    for (const item of data) {
      const key = item?.trait_type || item?.traitType || item?.name;
      const value = item?.value;
      if (key && value !== undefined) traits[String(key)] = String(value);
    }
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const attrs = obj.attributes || obj.traits;
    if (Array.isArray(attrs)) return normalizeTraits(attrs);
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string" || typeof value === "number") traits[key] = String(value);
    }
  }
  return traits;
}

export async function getTokenTraits(tokenId: number) {
  const bulk = await getBulkTraitsMap();
  if (bulk[String(tokenId)] && Object.keys(bulk[String(tokenId)]).length) {
    return bulk[String(tokenId)];
  }
  return cachedJson<NormieTraits>(`traits:${tokenId}`, jsonTtls.traits, async () => {
    const res = await fetchNormies(`/normie/${tokenId}/traits`);
    if (!res.ok) return {};
    return normalizeTraits(await res.json());
  });
}

export async function getTokenFlags(tokenId: number, traits: NormieTraits) {
  const isAgent = /agent/i.test(traits.Type || "");
  const metadata = await cachedJson<Record<string, unknown> | null>(`metadata:${tokenId}`, jsonTtls.metadata, async () => {
    const res = await fetchNormies(`/normie/${tokenId}/metadata`);
    if (res.status === 410) return { burned: true };
    if (!res.ok) return null;
    return res.json();
  });
  if ((metadata as { burned?: boolean } | null)?.burned) {
    const err = new Error(`Token ${tokenId} is burned and cannot be used.`);
    (err as Error & { status?: number }).status = 410;
    throw err;
  }
  const serialized = JSON.stringify(metadata || {}).toLowerCase();
  const attrs = normalizeTraits((metadata as { attributes?: unknown })?.attributes);
  const rank = typeof metadata?.rank === "number" ? metadata.rank : typeof metadata?.rarityRank === "number" ? metadata.rarityRank : null;

  return {
    isZombie: /zombie/.test(serialized),
    isAgent,
    isLegendary: /legendary canvas|legendary/.test(serialized),
    rarityRank: rank,
    personaName: typeof metadata?.name === "string" && isAgent ? metadata.name : attrs.Name || null
  };
}

export function assignPiece(traits: NormieTraits, flags: { isZombie: boolean; isAgent: boolean }) {
  if (flags.isAgent || /agent/i.test(traits.Type || "")) return "king";
  if (/alien/i.test(traits.Type || "")) return "queen";
  if (/top hat|crown|tiara|fedora/i.test(traits.Accessory || "")) return "bishop";
  if (/old/i.test(traits.Age || "")) return "rook";
  if (flags.isZombie || /cat/i.test(traits.Type || "")) return "knight";
  return "pawn";
}

export async function buildPieceData(tokenIds: number[]): Promise<PieceData[]> {
  const pieces: PieceData[] = [];
  for (const tokenId of tokenIds) {
    const traits = await getTokenTraits(tokenId);
    const flags = {
      isZombie: false,
      isAgent: /agent/i.test(traits.Type || ""),
      isLegendary: false,
      rarityRank: null,
      personaName: null
    };
    pieces.push({
      tokenId,
      traits,
      piece: assignPiece(traits, flags),
      ...flags
    });
  }
  return pieces;
}

export function sanitizeSvg(svg: string) {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
}

export async function getSanitizedSvg(tokenId: number) {
  await initDb();
  const key = `svg:${tokenId}`;
  const cached = await sql<{ text_payload: string }>`
    SELECT text_payload FROM api_cache
    WHERE cache_key = ${key} AND expires_at > NOW()
    LIMIT 1
  `;
  if (cached.rows[0]?.text_payload) return cached.rows[0].text_payload;
  const res = await fetchNormies(`/normie/${tokenId}/image.svg`);
  if (!res.ok) throw new Error("SVG not available");
  const svg = sanitizeSvg(await res.text());
  await sql`
    INSERT INTO api_cache(cache_key, text_payload, status, expires_at)
    VALUES (${key}, ${svg}, 200, NOW() + (${jsonTtls.svg} || ' seconds')::interval)
    ON CONFLICT(cache_key)
    DO UPDATE SET text_payload = EXCLUDED.text_payload, payload = NULL, status = 200, expires_at = EXCLUDED.expires_at, created_at = NOW()
  `;
  return svg;
}
