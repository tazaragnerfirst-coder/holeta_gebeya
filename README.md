# Holeta Gebeya

Telegram Mini App marketplace (buy/sell, peer-to-peer, no in-app payment).

## Stack
- **Frontend:** React + Vite, rendered inside the Telegram Mini App webview
  (`telegram-web-app.js` SDK). English-first UI. Deployed on Firebase Hosting
  (free Spark plan).
- **Data:** Firestore + Firebase Auth (both free on Spark).
- **Backend (auth verification):** a small Express server in
  `backend/server`, deployed on **Render** (free tier). This exists
  because Cloud Functions require Firebase's paid Blaze plan — Render
  does the same job (verify Telegram's login data, issue a Firebase
  custom token) without needing to enable billing.

## Key design decisions
- **Browsing is public.** Home, search, and product detail pages read
  Firestore directly with no login. An account is only created the
  moment someone taps **Chat with Seller** or **Post an Ad** — see
  `ensureLoggedIn()` in `frontend/src/lib/firebase.js`.
- **Login = Telegram, verified server-side.** The client sends Telegram's
  `initData` to the Render server's `/telegramAuth` endpoint, which
  validates the HMAC signature against the bot token (never trusts the
  client), then issues a Firebase custom auth token.
- **Category-driven post form.** `frontend/src/data/categories.js` defines
  category → subcategory → attribute schemas (brand, popular models,
  RAM, storage, screen size, etc. — Jiji-style). `PostAd.jsx` renders the
  right fields automatically from this file. Add a new subcategory there
  and its form appears with no other code changes.

## Setup

### 1. Firebase project (Spark plan — no billing needed)
Already created: project ID `holeta-c22fc`. Frontend config is filled
in at `frontend/src/lib/firebase.js`.

Enable **Firestore** and **Authentication** (Custom token / any
provider) in the Firebase Console if not already on.

Deploy Firestore rules:
```
firebase deploy --only firestore:rules,firestore:indexes --project holeta-c22fc
```

### 2. Firebase service account (for the Render server)
Firebase Console → Project Settings (⚙) → Service Accounts →
**Generate new private key** → downloads a JSON file. Base64-encode it:
```
base64 -w0 serviceAccountKey.json
```
Keep the output — you'll paste it into Render as an env var. **Never
commit this file to git.**

### 3. Deploy the backend to Render
1. https://render.com → New → Web Service → connect this GitHub repo
2. Root Directory: `backend/server`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variables:
   - `TELEGRAM_BOT_TOKEN` — from @BotFather
   - `FIREBASE_SERVICE_ACCOUNT_BASE64` — the base64 string from step 2
6. Deploy. Copy the resulting URL (e.g. `https://holeta-gebeya.onrender.com`)

### 4. Point the frontend at the Render backend
In `frontend/.env` (or your hosting build env):
```
VITE_BACKEND_URL=https://holeta-gebeya.onrender.com
```

### 5. Build & deploy the frontend
```
cd frontend
npm install
npm run build
firebase deploy --only hosting --project holeta-c22fc
```

### 6. Register the Mini App with BotFather
`@BotFather` → `/mybots` → your bot → **Bot Settings** → **Menu Button**
→ set it to your Firebase Hosting URL (e.g. `https://holeta-c22fc.web.app`).

## Note on Render's free tier
Free Render services sleep after inactivity and take a few seconds to
wake on the first request — fine for testing; upgrade later if this
becomes a UX problem in production.

## Status
Working scaffold: routing, public browsing, gated auth (via Render),
dynamic category form, chat, dashboard, profile. Visual polish still
needs to be ported over from the original HTML prototype into
`theme.css`. Next steps: image upload (Firebase Storage), boost/VIP
payment flow, report/moderation, push notifications via the Telegram
Bot API.
