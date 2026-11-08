# Architecture

## Runtime

One Cloudflare Worker runs Hono for `/api/*` and binds a Vite-built React app through the Workers Static Assets `ASSETS` binding. Local development uses Vite on port 5173 and Wrangler on port 8787; Vite proxies API calls to the Worker.

## Authentication

The Worker redirects to Google's OAuth 2.0 authorization endpoint, validates a short-lived OAuth state cookie, exchanges the code server-side, and fetches the Google profile. Only verified `@gmail.com` identities are accepted. Users are upserted into D1 and receive a 14-day HMAC-signed session cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, and root path attributes. The browser never receives an access token or stores a session token in localStorage.

## Attendance

The Worker derives local date, weekday, and clock using `Intl` with `Asia/Bangkok`. Schedule and leave records determine today's state; check-in/out events are persisted in D1. Monthly endpoints synthesize scheduled absence for elapsed days without attendance or leave. The frontend calls same-origin API routes and renders status, calendar, settings, and leave submission.

## Data flow

```text
Browser (React/Vite build) -> Cloudflare Worker (Hono) -> Cloudflare D1
                              -> Google OAuth / Google userinfo
```

## Deployment

Wrangler configuration is in `wrangler.toml`; migrations live in `migrations/`. GitHub Actions builds and deploys `main` using Cloudflare credentials in repository secrets. Runtime OAuth and session values are Worker secrets, not repository variables. See [DEPLOY.md](DEPLOY.md).
