# Security And Stability Checklist

## Implemented

- SIWE signatures are verified server-side.
- Nonces are one-time use and expire after 5 minutes.
- Sessions are stored as HMAC hashes, not raw tokens.
- Routes derive identity from the session token, not request bodies.
- Self-play is blocked for ranked direct games.
- Challenge accept uses an atomic `UPDATE ... WHERE status = 'open'` guard.
- Game moves are server-validated with `chess.js`.
- Move writes use optimistic concurrency to avoid stale overwrite races.
- Draw offers require at least 10 moves and can only be accepted by the opponent.
- Input validation covers addresses, token IDs, board squares, and message length.
- Normies SVGs are proxied and sanitized before being sent to the browser.
- SVG responses include a restrictive CSP.
- Body payloads are small by design and validated with Zod.
- Upstream Normies API calls use a shared 50/minute database-backed bucket.
- Public image/token/game endpoints also have per-IP request buckets.
- Expired sessions, nonces, cache entries, and challenges are cleaned by Vercel cron.
- Production fails if required environment values are missing through runtime access.

## Intentional Platform Changes

- No Redis: Postgres stores sessions, cache rows, and rate buckets.
- No Railway backend: Next.js route handlers are the backend.
- No Socket.io: polling is used for Vercel-free compatibility.

## Remaining Hardening Ideas

- Add CAPTCHA or wallet reputation to public challenge creation if spam appears.
- Add a replay viewer from stored moves.
- Add Socket.io or WebSocket rooms only if moving to a platform designed for persistent servers.
- Add a dedicated admin dashboard for cache/rate-limit inspection.
- Add full DOMPurify SVG sanitization if custom SVG complexity grows beyond the current Normies API proxy use case.
