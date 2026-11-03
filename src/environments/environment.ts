export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001/api',
  // See environment.prod.ts: the WebSocket base URL, kept separate from apiUrl so prod
  // can make apiUrl relative without breaking the socket connection's derived URL.
  wsUrl: 'http://localhost:3001',
  // Sentry DSN for error tracking. Empty by default (no-op) — set to enable.
  // e.g. "https://xxx@xxx.ingest.sentry.io/xxx"
  sentryDsn: ''
};
