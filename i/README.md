# Normies Chess

Normies Chess is a Vercel-ready, single-repo multiplayer chess app where Normies NFTs become chess pieces. It keeps the original product idea while changing the deployment model from Railway + Vercel to one free-friendly Vercel project.

## What Is Included

- SIWE login with server-issued nonces and hashed 24-hour sessions
- Normies holder lookup, token trait loading, and sanitized SVG proxying
- Postgres-backed games, moves, challenges, leaderboards, sessions, cache, and rate buckets
- Server-side chess validation with `chess.js`
- Challenge links with atomic accept handling
- All-time and weekly leaderboards
- Vercel cron cleanup for expired sessions, nonces, cache rows, and challenges
- Normies API protection with a shared 50 requests/minute upstream safety bucket

## Why This Version Is Different

The original document split the project across Railway, Railway Postgres, Railway Redis, and Vercel. This build uses one deploy surface:

- Next.js app routes replace the separate Express backend
- Vercel Postgres replaces PostgreSQL + Redis
- Database TTL rows replace Redis sessions/cache
- Polling every 2 seconds replaces Socket.io so the app works reliably on free Vercel deployment
- Normies API calls are centralized behind server routes

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

For local database testing, create a Vercel Postgres database and pull env vars:

```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
```

Then set:

```env
SIWE_DOMAIN=localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
SESSION_SECRET=<64-char-random-hex>
```

Open `http://localhost:3000`.

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Security Notes

See [SECURITY.md](./SECURITY.md).
