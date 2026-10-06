# Security notes (Phase 1)

| Control                | Implementation                                                                                                                                                      | Verified by                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Password hashing       | Argon2id, 64 MiB / t=3 / p=1                                                                                                                                        | Test asserts `$argon2id$` and no plaintext         |
| Sessions               | Opaque ID, SHA-256 at rest, HttpOnly + SameSite=Lax (+ `__Host-` and Secure in production), rotation on login/password change, idle + absolute timeouts, revocation | Auth tests incl. rotation, logout, expiry          |
| CSRF                   | Session-bound token (anonymous: HMAC of a cookie), Origin check, every non-GET                                                                                      | Tests with missing, forged, and cross-origin       |
| RBAC                   | Policy matrix in `server/services/policy.ts`, enforced in controllers; admin routes also require a TOTP-verified session                                            | Negative tests (anonymous, client, disabled user)  |
| Lockout / rate limits  | 5 failures then backoff; Postgres-backed counters per IP, per IP+email, per account                                                                                 | Lockout and 429 tests                              |
| Enumeration resistance | Uniform login, register, reset, and resend responses; dummy hash for unknown accounts                                                                               | Tests compare responses                            |
| Admin TOTP             | AES-256-GCM secret at rest, replay protection, 10 hashed recovery codes, attempt limits, CLI break-glass                                                            | TOTP + recovery + reset tests                      |
| Validation             | Zod `.strict()` on every body and param                                                                                                                             | 422 tests                                          |
| Headers                | Helmet on the API; CSP and security headers for the site in `vercel.json`                                                                                           | API header test; site headers **not yet verified** |
| Audit log              | Auth events and admin actions, no secrets                                                                                                                           | Audit test                                         |

## Not done in Phase 1 (do not assume these exist)

Uploads and malware scanning (Phase 3), breached-password check, cross-instance burst-proof rate limiting (fixed windows allow a burst at a boundary), scheduled purge of expired sessions and rate-limit rows, browser Turnstile widget, DB-level append-only grant on `activity_logs` (documented, not automated), browser-level tests.
