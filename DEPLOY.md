# Deployment

## Prerequisites

- Cloudflare account with Workers and D1 enabled.
- Google OAuth 2.0 Web application credentials and an approved production URL.
- Node.js 20+ and npm.

## Google OAuth setup

In Google Cloud Console configure the OAuth consent screen and create a Web application client. Add the deployed callback `https://YOUR-WORKER-DOMAIN/api/auth/google/callback` as an authorized redirect URI. Set the local callback `http://localhost:8787/api/auth/google/callback` when testing locally. The app rejects non-Gmail or unverified Google addresses.

## Create and configure Cloudflare resources

1. Create a D1 database named `working-time-db` and replace the local placeholder ID (`00000000-0000-0000-0000-000000000000`) in `wrangler.toml` with its database ID.
2. Set `APP_URL` in `wrangler.toml` to the deployed Worker URL.
3. Apply the schema: `npm run db:migrate:remote`.
4. Set runtime secrets without committing them:

```sh
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REDIRECT_URI
npx wrangler secret put SESSION_SECRET
```

Use a long random `SESSION_SECRET` (at least 32 random bytes). `GOOGLE_REDIRECT_URI` must exactly match the authorized callback URI configured in Google Cloud Console. For local OAuth, create an untracked `.dev.vars` file from `.env.example` and use local test credentials; never put credentials in source control.

## Deploy

```sh
npm install
npm run deploy
```

The deploy script builds the frontend and runs `wrangler deploy` for the single Worker with static assets. Runtime secrets must already be set in the target Worker.

## GitHub Actions

The workflow `.github/workflows/deploy.yml` deploys after a push to `main`. Add repository Actions secrets `CLOUDFLARE_API_TOKEN` (Workers Scripts and D1 edit permissions) and `CLOUDFLARE_ACCOUNT_ID`. Create the D1 database and set Worker OAuth secrets as above before enabling production traffic. Database migrations are an explicit release step and should be applied to the intended D1 database before deploying schema-dependent changes.
