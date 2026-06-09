const REQUIRED = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
] as const;

export function validateEnv(): void {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`[startup] Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}
