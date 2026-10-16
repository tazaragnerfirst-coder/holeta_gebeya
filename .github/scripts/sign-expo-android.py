"""Patch the Expo-generated android/app/build.gradle for release signing.

Run from the mobile/ directory after `npx expo prebuild`. Expects the
signing secrets as environment variables (KEYSTORE_PASS, KEY_ALIAS,
KEY_PASS) and VERSION_CODE. The keystore must already be at
android/app/release.keystore.
"""
import os
import re
import sys

path = 'android/app/build.gradle'
s = open(path).read()
vc = os.environ['VERSION_CODE']

# Every build gets a higher versionCode so Android installs it over the previous one.
s, n1 = re.subn(r'versionCode\s+\d+', f'versionCode {vc}', s, count=1)
s, n2 = re.subn(r'versionName\s+"[^"]*"', f'versionName "1.{vc}"', s, count=1)

# Add a release entry inside the existing signingConfigs { } block.
release_entry = "\n".join([
    "        release {",
    '            storeFile file("release.keystore")',
    '            storePassword System.getenv("KEYSTORE_PASS")',
    '            keyAlias System.getenv("KEY_ALIAS")',
    '            keyPassword System.getenv("KEY_PASS")',
    "        }",
]) + "\n"
s, n3 = re.subn(r'(\n    signingConfigs \{\n)', lambda m: m.group(1) + release_entry, s, count=1)

# Point only the release buildType at the release signing config.
idx = s.index('buildTypes {')
head, tail = s[:idx], s[idx:]
tail, n4 = re.subn(r'(release \{[^}]*?)signingConfig signingConfigs\.debug',
                   r'\1signingConfig signingConfigs.release', tail, count=1)
s = head + tail

if not all([n1, n2, n3, n4]):
    sys.exit(f'build.gradle patch failed: versionCode={n1} versionName={n2} signingConfigs={n3} release={n4}')

open(path, 'w').write(s)
print('Patched build.gradle: versionCode', vc)
