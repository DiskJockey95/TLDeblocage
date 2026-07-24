# TLDeblocage

## SMTP setup

1. Copy `.env.example` to `.env`.
2. For Gmail, use a Google account with 2-Step Verification enabled and generate an App Password.
3. Fill in `SMTP_USER` with your full Gmail address and `SMTP_PASS` with the 16-character app password.
4. Keep `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, and `SMTP_SECURE=false`.
5. Add `CORS_ORIGIN` with your GitHub Pages origin so the browser can call the Railway backend.
6. Run `npm install`.
7. Start the app with `npm start` and open `http://localhost:3000`.

The quote form now submits to the local Node server, which sends the email through SMTP to `tldeblocage@gmail.com`.

If you prefer to send from a different Gmail/Workspace inbox, set `MAIL_FROM` to that verified address too.

For Railway, set `PORT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_FROM_NAME`, and `CORS_ORIGIN` in the Railway service variables.