export const environment = {
  production: true,
  // Relative: proxied same-origin through vercel.json's /api/:path* rewrite to the
  // Railway backend. Railway's edge strips Access-Control-Allow-Origin for custom-domain
  // origins (confirmed: the header is present when queried from inside the container,
  // missing once it crosses Railway's public edge) — same-origin avoids CORS entirely
  // instead of working around a platform limitation Railway doesn't expose a fix for.
  apiUrl: '/api',
  // The WebSocket connection stays a direct cross-origin connection to Railway: Vercel's
  // rewrites don't reliably proxy a persistent WebSocket upgrade, so this one keeps the
  // real backend URL rather than deriving it from apiUrl like before.
  wsUrl: 'https://inv-app-production-1eb0.up.railway.app',
  // Sentry DSN for error tracking. Empty until a real Sentry project is provisioned.
  // e.g. "https://xxx@xxx.ingest.sentry.io/xxx"
  sentryDsn: ''
};
