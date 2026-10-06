# ADR 005: Chat transport is short polling

Status: accepted

Vercel serverless functions are poor hosts for long-held SSE connections. Chat (Phase 4) will poll with a cursor behind a ChatTransport interface, and the UI will say it is polling, not real-time. Revisit if the host changes.
