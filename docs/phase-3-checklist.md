# Phase 3 manual check (about 15 minutes)

Run locally with `npm run dev` (needs `.env` with `DATABASE_URL`, secrets, and `ADMIN_EMAIL` seeded; see README). Emails print in the terminal. Uploaded files go to `.data/uploads`.

Before the first run, apply the new migration: `npm run db:migrate`.

## 1. Visitor flow (use a private window, not signed in)

1. Open `/contact`. Three paths and the assessment link are visible. Contact is in the top navigation.
2. Open **I need a new system**. The existing-system questions are hidden. Choose "I already have a system": they appear with the red "Never send passwords..." warning.
3. Press **Send my request** with nothing filled in. Each problem is shown next to its field, and nothing is sent.
4. Fill in the required fields (name, email, project type, a description of 20+ characters, privacy checkbox). Attach a PNG or PDF. Send.
5. A reference like `INQ-2026-000001` appears **only after** the request is saved. The file shows "Uploaded".
6. In the terminal running the API you see two emails: the confirmation and the admin notification (if an admin exists).
7. Refresh before sending a second form halfway: your typed answers come back ("restored your saved draft"). The consent box is not restored. After a successful send, the draft is gone.
8. Try an invalid file: rename a `.txt` to `.png`, or pick an `.exe`. It is refused with a clear message. A refused file never un-saves the request.
9. Open **/assessment**, fill it in, and send. The reference starts with `ASM-`.
10. On your phone (or a 360 px wide window): no sideways scrolling, every field and button is easy to tap.

## 2. Admin flow

1. Sign in as admin and complete the authenticator step.
2. Open **Admin > Inquiries**. The requests you just sent are listed. Click a reference.
3. The details are all there. Your attachment shows "Not scanned" and a Download link. Download works.
4. Change the status and add a note, then **Save changes**. "Saved." appears only after the server confirms it.
5. Back in the list, filter by that status and search for the sender's name.
6. **Delete request** needs a second click. The request disappears from the list.

## 3. Things that should fail

- Submit the same form 6 times within an hour from one connection: the 6th is refused with a "too many attempts" message.
- A signed-in client who opens `/admin/inquiries` sees "You do not have access".
- Signed out, opening `/api/v1/admin/inquiries` returns an error, not data.

Anything that looks wrong or confusing: send me a screenshot and the step number.
