# Combined demo and technical explanation — target 7:40

This is a recording script, not a video. Record **your real webcam and screen**, with your own voice. The complete submission recording must be at most eight minutes. Do not record personal tabs, `.env`, database URLs, auth secrets, or private messages. Use only synthetic notes and the reviewer account. Record the verified live deployment after release, not a localhost URL presented as production.

## Before recording

- Rehearse once and keep webcam visible in a corner without covering form fields.
- Open the live app, owner and guest browser windows, `src/server/shares.ts`, schema, and real test output.
- Have an existing reviewer login ready. In the recording, briefly show the registration form, then sign in; do not spend time typing a full new account if time is tight.
- Use three notes: public time-based, protected one-time, and short-expiry public. Set the short-expiry note for the next minute so it expires while other flows are shown. Use a fresh date; never predeclare expiration.
- Arrange editor tabs at `accessShare` and the conditional UPDATE. Practice the explanation from `TECHNICAL_VIDEO_SCRIPT.md`.
- Record with Google Meet or another tool you already use, then trim only dead time. Do not remove evidence of the wrong-key/count check or one-time failure.

## Timed screen actions and spoken outline

| Time      | Screen/action                                                                            | Say naturally                                                                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:20 | Webcam and live home page; show HTTPS address                                            | “Hi, I'm Adarsh. This is QuietNote, my secure note-sharing POC for Peacock India. I'll show the sharing rules and then the database operation that enforces one-time access.” |
| 0:20–0:45 | Show register fields, then login with reviewer account                                   | “Accounts own their notes. A recipient only needs the share link and, for protected notes, the generated key.”                                                                |
| 0:45–1:25 | Create public time-based note, future expiry; show and copy URL                          | “This one is public, so there's no access key. Public means anyone with the link, not a searchable public feed. I'll open it in a separate recipient window.”                 |
| 1:25–1:45 | Open public note; refresh management page and show count 1                               | “The explicit Open note button performs the access. Loading the page alone doesn't count. The successful view is now one.”                                                    |
| 1:45–2:15 | Create public short-expiry note and save URL                                             | “This link expires at the selected local time. The server converts it and enforces expiry using database time. We'll return to it shortly.”                                   |
| 2:15–2:55 | Create protected one-time note; show generated key and copy controls                     | “The server generated this key. The application shows it only now and stores a hash. I would send the link and key separately.”                                               |
| 2:55–3:20 | Guest enters wrong key; owner refresh shows count 0                                      | “The wrong key is rejected. The view count stays zero, and this has not consumed the link.”                                                                                   |
| 3:20–3:45 | Enter correct key; note opens; owner refresh shows count 1/USED; guest reload fails      | “The correct key opens the note once. The share is now used, and a second attempt fails. The count stays one.”                                                                |
| 3:45–4:05 | Reopen short-expiry link; show EXPIRED and count 0                                       | “Time-based expiry is checked on the backend. The expired link doesn't reveal content or add a view.”                                                                         |
| 4:05–4:30 | Revoke first public link; confirm; guest reload fails; owner shows REVOKED/count still 1 | “The owner can revoke early. I preserve the record for status and statistics. Revocation can't erase something a reader already copied.”                                      |
| 4:30–7:25 | Explain actual schema/API/claim/tests using technical script below                       | Use the technical segment; do not read every line or claim benchmark results.                                                                                                 |
| 7:25–7:40 | Return to live app                                                                       | “The repository includes setup, migrations, real database tests and security tradeoffs. I'm ready to explain or modify these flows. Thank you.”                               |

## Required evidence checklist

Registration/login shown; note creation; generated URL; public and protected flows; generated key; wrong key; unchanged count after wrong key; correct key and increased count; one-time second attempt; time expiry; owner revoke; revoked failure; final status/count; webcam visible; actual API/service code explained; complete duration <= 8:00.

## After recording

Watch the entire exported file. Verify webcam, audio, text readability and length. Upload to an authorized video/Drive destination, grant reviewer access, and test the link without relying on your signed-in session. Only then place its real URL in the submission email. A script or local screen capture without your webcam does not satisfy the employer's video requirement.
