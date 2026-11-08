# Deployment

## Prerequisites

- Cloudflare account with Workers and D1 enabled.
- Google OAuth 2.0 Web application credentials and an approved production URL.
- Node.js 20+ and npm.

## Google OAuth setup

In Google Cloud Console configure the OAuth consent screen and create a Web application client. Add the deployed callback `https://YOUR-WORKER-DOMAIN/api/auth/google/callback` as an authorized redirect URI. Set the local callback `http://localhost:8787/api/auth/google/callback` when testing locally. The app rejects non-Gmail or unverified Google addresses.

## Create and configure Cloudflare resources

1. Create a D1 database named `working-time-db` and replace the local placeholder ID (`00000000-0000-0000-0000-000000000000`) in `wrangler.toml` with its database ID.
2. Set `APP_URL` in `wrangler.toml` to the deployed Worker URL. The deployment workflow refuses to deploy while it still points to localhost or uses the placeholder D1 ID.
3. For a manual first deployment, apply the schema with `npm run db:migrate:remote`.
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

The workflow `.github/workflows/deploy.yml` builds on every push to `main`. It deploys only after all production configuration is present. Add these repository Actions secrets:

- `CLOUDFLARE_API_TOKEN` with Workers Scripts and D1 edit permissions
- `CLOUDFLARE_ACCOUNT_ID`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `GOOGLE_REDIRECT_URI`

The workflow checks the D1 ID and `APP_URL` in `wrangler.toml`, applies remote D1 migrations, syncs the four Worker secrets, then deploys. Until the secrets and real production IDs are configured, the build will pass and the deployment step will be clearly skipped with the missing items listed in the Actions summary. Never put secret values in the workflow file.
