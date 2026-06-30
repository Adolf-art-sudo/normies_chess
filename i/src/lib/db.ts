import { sql } from "@vercel/postgres";

let initPromise: Promise<void> | null = null;

export async function initDb() {
  if (!initPromise) {
    initPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS players (
          address TEXT PRIMARY KEY,
          ens_name TEXT,
          wins INTEGER NOT NULL DEFAULT 0,
          losses INTEGER NOT NULL DEFAULT 0,
          draws INTEGER NOT NULL DEFAULT 0,
          total_points INTEGER NOT NULL DEFAULT 0,
          win_streak INTEGER NOT NULL DEFAULT 0,
          best_streak INTEGER NOT NULL DEFAULT 0,
          normie_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          is_holder BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS nonces (
          nonce TEXT PRIMARY KEY,
          address TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          address TEXT NOT NULL REFERENCES players(address) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS api_cache (
          cache_key TEXT PRIMARY KEY,
          payload JSONB,
          text_payload TEXT,
          status INTEGER NOT NULL DEFAULT 200,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS rate_buckets (
          scope TEXT NOT NULL,
          bucket_start TIMESTAMPTZ NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (scope, bucket_start)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS games (
          id UUID PRIMARY KEY,
          white_address TEXT NOT NULL REFERENCES players(address),
          black_address TEXT NOT NULL REFERENCES players(address),
          white_normie_ids JSONB NOT NULL,
          black_normie_ids JSONB NOT NULL,
          state JSONB NOT NULL,
          pgn TEXT NOT NULL DEFAULT '',
          fen TEXT NOT NULL,
          result TEXT,
          white_points_earned INTEGER NOT NULL DEFAULT 0,
          black_points_earned INTEGER NOT NULL DEFAULT 0,
          is_ranked BOOLEAN NOT NULL DEFAULT true,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ended_at TIMESTAMPTZ
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS moves (
          id BIGSERIAL PRIMARY KEY,
          game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
          move_number INTEGER NOT NULL,
          player_address TEXT NOT NULL,
          from_square TEXT NOT NULL,
          to_square TEXT NOT NULL,
          san TEXT NOT NULL,
          normie_id INTEGER,
          captured_normie_id INTEGER,
          is_capture BOOLEAN NOT NULL DEFAULT false,
          is_check BOOLEAN NOT NULL DEFAULT false,
          is_checkmate BOOLEAN NOT NULL DEFAULT false,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS challenges (
          id UUID PRIMARY KEY,
          challenger_address TEXT NOT NULL REFERENCES players(address),
          challenger_normie_ids JSONB NOT NULL,
          opponent_address TEXT,
          message TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'open',
          game_id UUID REFERENCES games(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS weekly_points (
          player_address TEXT NOT NULL REFERENCES players(address) ON DELETE CASCADE,
          points INTEGER NOT NULL DEFAULT 0,
          week_start DATE NOT NULL,
          PRIMARY KEY (player_address, week_start)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS games_white_idx ON games(white_address)`;
      await sql`CREATE INDEX IF NOT EXISTS games_black_idx ON games(black_address)`;
      await sql`CREATE INDEX IF NOT EXISTS challenges_open_idx ON challenges(status, expires_at)`;
      await sql`CREATE INDEX IF NOT EXISTS weekly_points_week_idx ON weekly_points(week_start, points DESC)`;
    })();
  }
  return initPromise;
}

export { sql };
