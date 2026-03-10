# Security Overview

**Last Updated**: January 19, 2026

---

## Summary

InvApp implements multiple layers of security following OWASP best practices to protect against common web vulnerabilities.

| Security Measure | Status | Approach |
|------------------|--------|----------|
| CSRF Protection | Implemented | Double Submit Cookie Pattern |
| XSS Protection | Implemented | HttpOnly cookies, CSP headers |
| SQL Injection | Implemented | Prisma ORM parameterized queries |
| Password Security | Implemented | bcrypt hashing, strong requirements |
| Rate Limiting | Implemented | Tiered throttling |
| Security Headers | Implemented | Helmet middleware |
| Input Validation | Implemented | DTO validation with class-validator |
| CORS | Implemented | Restricted origin with credentials |
| JWT Security | Implemented | HttpOnly cookies |
| Error Handling | Implemented | Global exception filter |

---

## CSRF Protection

Uses the Double Submit Cookie pattern:

1. Client requests a CSRF token from the server
2. Server generates a token and sets an HttpOnly cookie
3. Client includes the token in a header for state-changing requests
4. Server validates the token matches the cookie

---

## Token Storage

JWT tokens are stored in HttpOnly cookies, preventing JavaScript access and mitigating XSS-based token theft. All requests include credentials automatically.

---

## Password Security

- Minimum 12 characters with complexity requirements (uppercase, lowercase, number, special character)
- bcrypt hashing with salt rounds

---

## Rate Limiting

Tiered rate limiting is applied globally, with stricter limits on authentication endpoints to prevent brute-force attacks.

---

## Security Headers

Helmet middleware configures standard security headers including Content-Security-Policy, HSTS, X-Frame-Options, and others.

---

## Input Validation

All incoming requests are validated using DTOs with class-validator. Unknown properties are stripped and rejected.

---

## CORS

Restricted to the configured frontend origin with credential support for cookie-based authentication.

---

## Planned Improvements

- Content Security Policy refinement for production
- Request payload size limits
- Two-factor authentication (2FA)
- Account lockout after failed attempts
- Security scanning in CI/CD

---

## Environment Variables (Production)

The following environment variables must be configured for production deployment:

- `JWT_SECRET` — Strong random secret (min 32 characters)
- `CSRF_SECRET` — Strong random secret (min 32 characters)
- `CORS_ORIGIN` — Frontend domain URL
- `DATABASE_URL` — Database connection string
- `NODE_ENV` — Set to `production`
