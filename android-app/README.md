# Android app (APK)

A thin Capacitor shell that opens the live site (https://holeta-c22fc.web.app),
so every website deploy reaches the app instantly with no new APK needed.
Only rebuild the APK to change the icon, name or package settings.

Built in CI by `.github/workflows/build-apk.yml` (Actions → "Build Android APK"
→ Run workflow). The APK is attached to the `apk-latest` release:
https://github.com/tazaragnerfirst-coder/holeta_gebeya/releases/download/apk-latest/HoletaGebeya.apk

It is debug-signed (installable directly, not Play Store ready). Users must allow
"Install unknown apps" for the app they open the file from.
