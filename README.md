# Holeta Gebeya

Telegram Mini App marketplace (buy/sell, peer-to-peer, no in-app payment).

## Stack
- **Frontend:** React + Vite, rendered inside the Telegram Mini App webview
  (`telegram-web-app.js` SDK). English-first UI.
- **Backend:** Firebase — Firestore (data), Cloud Functions (Telegram auth
  verification), Firebase Auth (custom tokens).

## Key design decisions
- **Browsing is public.** Home, search, and product detail pages read
  Firestore directly with no login. An account is only created the
  moment someone taps **Chat with Seller** or **Post an Ad** — see
  `ensureLoggedIn()` in `frontend/src/lib/firebase.js`.
- **Login = Telegram, verified server-side.** The client sends Telegram's
  `initData` to the `telegramAuth` Cloud Function, which validates the
  HMAC signature against the bot token (never trusts the client), then
  issues a Firebase custom auth token.
- **Category-driven post form.** `frontend/src/data/categories.js` defines
  category → subcategory → attribute schemas (brand, popular models,
  RAM, storage, screen size, etc. — Jiji-style). `PostAd.jsx` renders the
  right fields automatically from this file. Add a new subcategory there
  and its form appears with no other code changes.

## Setup

### 1. Firebase project
```
npm install -g firebase-tools
firebase login
firebase projects:create holeta-gebeya   # or use an existing project
```
Put the project ID in `.firebaserc`.

### 2. Frontend config
Fill in `frontend/src/lib/firebase.js` → `firebaseConfig` with the values
from Firebase Console → Project Settings → General → Your apps → Web app.

### 3. Telegram bot token (server-side secret — never in frontend code)
```
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
```
Paste the token from @BotFather when prompted.

### 4. Install & run
```
cd frontend && npm install && npm run dev
cd backend/functions && npm install
firebase emulators:start   # local Firestore + Functions
```

### 5. Deploy
```
cd frontend && npm run build
firebase deploy
```

### 6. Register the Mini App with BotFather
`/newapp` → select your bot → set the Web App URL to your deployed
Firebase Hosting URL.

## Status
Working scaffold: routing, public browsing, gated auth, dynamic
category form, chat, dashboard, profile. Visual polish still needs to
be ported over from the original HTML prototype into `theme.css`.
Next steps: image upload (Firebase Storage), boost/VIP payment flow,
report/moderation, push notifications via the Telegram Bot API.
