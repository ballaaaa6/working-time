# Working Time development instructions

- Keep the app mobile-first, Thai-language, and fixed to Asia/Bangkok for all attendance dates and times.
- Use D1 for user data. Never add mock authentication or localStorage tokens.
- Run `npm run build` after implementation changes that affect TypeScript or the frontend.
- Before starting a local development server, inspect listeners and process command lines for this repository. Reuse a healthy server already running for this repository.
- Never rely on automatic fallback ports. If the configured port is occupied by an unrelated or unhealthy process, report it or stop only the exact project process when authorized.
- Track every long-running process started during a task and stop its process tree after verification unless the user explicitly asks to keep it running.
- Do not terminate Codex-owned `mcp/server.mjs`, `node_repl`, or processes under `OpenAI\Codex\runtimes` during project cleanup.
- Before completing a task that started local tooling, check for duplicate Vite, Wrangler, workerd, Next.js, or similar development processes and clean up only the processes created for that task.
