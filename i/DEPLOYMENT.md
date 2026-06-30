# Deployment

This repo is configured for a single Vercel deployment.

## 1. Push The Repo

```bash
git init
git add .
git commit -m "init normies chess"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/normies-chess.git
git push -u origin main
```

## 2. Create A Vercel Project

1. Go to Vercel.
2. Import the GitHub repo.
3. Framework preset: `Next.js`.
4. Root directory: repo root.
5. Deploy once. It may fail until storage/env vars are added.

## 3. Add Vercel Postgres

1. In the Vercel project, open `Storage`.
2. Create or connect a Postgres database.
3. Vercel will add `POSTGRES_URL` and related variables automatically.

## 4. Add Environment Variables

Set these in Vercel project settings:

```env
SESSION_SECRET=<generate with openssl rand -hex 32>
SIWE_DOMAIN=<your-vercel-domain-without-https>
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
```

Example:

```env
SIWE_DOMAIN=normies-chess.vercel.app
NEXT_PUBLIC_APP_URL=https://normies-chess.vercel.app
```

## 5. Redeploy

Trigger a redeploy from Vercel. Database tables are created lazily on first API use.

## 6. Verify

```bash
curl https://<your-vercel-domain>/health
```

Expected:

```json
{"status":"ok"}
```

Then open the app, sign in with an injected Ethereum wallet, load holder tokens, and create a challenge or direct game.

## Operational Notes

- This build intentionally avoids Socket.io because free Vercel serverless deployments are not a natural fit for room-based persistent WebSocket state.
- Game sync uses 2-second polling, backed by Postgres optimistic concurrency checks.
- The Normies API is protected by a shared database rate bucket at 50 upstream calls/minute.
- Cold games use the bulk immutable traits endpoint first, then lazy metadata checks for mutable flags.
