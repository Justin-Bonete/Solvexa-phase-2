# ADR 003: Server-side sessions in PostgreSQL

Status: accepted

Opaque session ID cookie with only its hash stored in Postgres, instead of JWT. Gives instant revocation, rotation, role-specific idle and absolute timeouts, and a CSRF secret bound to the session.
