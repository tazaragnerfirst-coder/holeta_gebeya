# Android app (APK)

A Capacitor shell that contains the whole web app. The build in
`.github/workflows/build-apk.yml` compiles `frontend/` with `VITE_NATIVE=1`,
copies the result into `www/`, and wraps it as an APK. The app runs fully
from the phone: it opens without a connection, shows cached listings and chats
offline, and needs the network only for live data and actions.

Because the APK carries its own copy of the app, a new APK is needed for
every app change (run "Build Android APK" in Actions, or push to `main`).
The website (Firebase Hosting) is unaffected by this.

Output: https://github.com/tazaragnerfirst-coder/holeta_gebeya/releases/download/apk-latest/HoletaGebeya.apk

It is debug-signed (installable directly, not Play Store ready). Users must allow
"Install unknown apps" for the app they open the file from.
