# Sightline Frontend

This is the frontend dashboard for Sightline, built with React, TanStack Router, and Vite.

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

## Environment variables

Public client config (safe to expose, `VITE_` prefix):

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=sightline-9d056.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sightline-9d056
VITE_FIREBASE_STORAGE_BUCKET=sightline-9d056.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_WEBHOOK_URL=https://your-vm:8000/webhook/job
```

Server-only secrets (no `VITE_` prefix — never ship these to the browser):

```bash
WEBHOOK_SECRET=your-webhook-secret
```

See `.env.example` for the full list.

## Job submission security

The browser never talks to the VM worker directly and never sees the webhook
shared secret. Job requests go to the TanStack Start server function
`submitJobFn` (`src/lib/jobs-server.ts`), which verifies the caller's Firebase
ID token, enforces a per-org cap (`MAX_QUEUED_JOBS_PER_ORG`), signs the raw
JSON body with HMAC-SHA256 using the server-only `WEBHOOK_SECRET`, and
forwards it to `POST /webhook/job` with the `X-Webhook-Signature` header.

> Older docs suggested a `VITE_`-prefixed webhook secret variable for the
> frontend. That was a security bug (anything `VITE_` is bundled into client
> JS). Do NOT set any `VITE_`-prefixed variant of the secret anywhere — it
> lives only in the server environment as `WEBHOOK_SECRET`.

## Preview

```bash
bun run preview
```

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
