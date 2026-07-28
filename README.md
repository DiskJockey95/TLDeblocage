# TLDeblocage

## Email API setup

1. Copy `.env.example` to `.env`.
2. Create a Resend account and verify a sender domain or email address.
3. Set `RESEND_API_KEY` to your Resend API key.
4. Set `RESEND_FROM` to a verified sender like `TL Déblocage <no-reply@your-domain.com>`.
5. Add `CORS_ORIGIN` with your GitHub Pages origin so the browser can call the Railway backend.
6. Run `npm install`.
7. Start the app with `npm start` and open `http://localhost:3000`.

The quote form now submits to the local Node server, which sends the email through Resend to `tldeblocage@gmail.com`.

For Railway, set `RESEND_API_KEY`, `RESEND_FROM`, and `CORS_ORIGIN` in the Railway service variables.