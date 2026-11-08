import { mkdir } from 'node:fs/promises';

await mkdir(new URL('../dist', import.meta.url), { recursive: true });
