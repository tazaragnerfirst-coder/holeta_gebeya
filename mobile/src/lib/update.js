import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-app update: a newer build is announced inside the app and installed from
// there, instead of going back to the download link.
//
// CI publishes version.json next to the APK on the same release (see
// .github/workflows/build-mobile-apk.yml): { versionCode, versionName, size, url }.
// versionCode is the workflow run number, which is also the installed build's
// versionCode, so "newer" is a plain number comparison.
//
// DATA-SAVING by design (the person pays for mobile data):
//  - the check is a tiny JSON file, and runs at most once every 12 hours;
//  - the APK is only downloaded after the person taps "Update now";
//  - on mobile data the person is shown the size first and can pick "Later"
//    to update on Wi-Fi;
//  - "Later" quiets the same version for 3 days;
//  - a finished download is kept (and size-checked), so a cancelled install or
//    the "allow installs" detour never downloads the APK twice;
//  - the leftover APK is deleted once that version is installed;
//  - the APK itself is built for 64-bit phones only (about a third of the size).
//
// Native modules are loaded only when needed (never at startup), so a problem
// here can't stop the app from opening; every entry point swallows errors.
const VERSION_URL =
  'https://github.com/tazaragnerfirst-coder/holeta_gebeya/releases/download/mobile-apk-latest/version.json';

const CHECK_EVERY_MS = 12 * 60 * 60 * 1000;
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const K_CHECKED = 'hg_update_checked_at';
const K_SNOOZE = 'hg_update_snooze';
const K_APK = 'hg_update_apk';

const apkName = (versionCode) => `HoletaGebeya-${versionCode}.apk`;
const toMb = (bytes) => `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;

async function installedBuild() {
  const Application = await import('expo-application');
  const n = Number(Application.nativeBuildVersion);
  return Number.isFinite(n) ? n : null;
}

// Deletes the APK left in the cache by an earlier update once that version is running.
async function cleanupOldApk(current) {
  const saved = Number(await AsyncStorage.getItem(K_APK));
  if (!saved || current < saved) return;
  try {
    const { File, Paths } = await import('expo-file-system');
    const f = new File(Paths.cache, apkName(saved));
    if (f.exists) f.delete();
  } catch {
    // Nothing to clean up.
  }
  await AsyncStorage.removeItem(K_APK);
}

// Returns the update info when a newer build exists (and wasn't just
// postponed), otherwise null. Throttled; never throws for network trouble.
export async function checkForUpdate() {
  if (Platform.OS !== 'android') return null;
  const current = await installedBuild();
  if (current === null) return null;
  await cleanupOldApk(current);

  const last = Number(await AsyncStorage.getItem(K_CHECKED)) || 0;
  if (Date.now() - last < CHECK_EVERY_MS) return null;

  const r = await fetch(VERSION_URL, { cache: 'no-store' });
  if (!r.ok) return null;
  const info = await r.json();
  // Only a successful read uses up the 12 hours — being offline doesn't.
  await AsyncStorage.setItem(K_CHECKED, String(Date.now()));
  if (typeof info.versionCode !== 'number' || typeof info.url !== 'string') return null;
  if (info.versionCode <= current) return null;

  try {
    const snooze = JSON.parse((await AsyncStorage.getItem(K_SNOOZE)) || 'null');
    if (snooze && snooze.versionCode === info.versionCode && Date.now() < snooze.until) return null;
  } catch {
    // Unreadable snooze — treat as none.
  }
  return info;
}

// Downloads the APK into the app cache (skipped if a complete copy is already
// there) and hands it to Android's installer. The person still taps Install;
// Android doesn't allow an app to install itself silently. Same keystore and
// package name, so the install replaces the old build and keeps the data.
export async function downloadAndInstall(info, onProgress) {
  const { File, Paths } = await import('expo-file-system');
  const { getContentUriAsync } = await import('expo-file-system/legacy');
  const IntentLauncher = await import('expo-intent-launcher');

  const dest = new File(Paths.cache, apkName(info.versionCode));
  const haveComplete = dest.exists && typeof info.size === 'number' && dest.size === info.size;

  if (!haveComplete) {
    if (dest.exists) dest.delete();
    const task = File.createDownloadTask(info.url, dest, {
      onProgress: ({ bytesWritten, totalBytes }) => {
        if (onProgress && totalBytes > 0) onProgress(bytesWritten / totalBytes);
      },
    });
    const file = await task.downloadAsync();
    if (!file) throw new Error('Download failed. Check your connection and try again.');
    if (typeof info.size === 'number' && file.size !== info.size) {
      file.delete();
      throw new Error('The download was incomplete. Please try again.');
    }
  }

  await AsyncStorage.setItem(K_APK, String(info.versionCode));
  const contentUri = await getContentUriAsync(dest.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}

async function onMobileData() {
  try {
    const Network = await import('expo-network');
    const state = await Network.getNetworkStateAsync();
    return state.type === Network.NetworkStateType.CELLULAR;
  } catch {
    return false;
  }
}

// Shows a two-button dialog; resolves true for the confirm button.
function confirm(title, message, confirmLabel, laterLabel) {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: laterLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}

let busy = false;

// The whole flow: check (throttled) -> ask -> download -> install.
// `onProgress(0..1)` while downloading, then `onProgress(null)` when done.
export async function maybeOfferUpdate(onProgress) {
  if (busy) return;
  busy = true;
  try {
    const info = await checkForUpdate();
    if (!info) return;

    const size = typeof info.size === 'number' ? toMb(info.size) : null;
    const cellular = await onMobileData();
    const go = cellular
      ? await confirm(
        'You are on mobile data',
        `A new version is ready${size ? ` (${size})` : ''}. Updating uses your data — it's better to update on Wi-Fi.`,
        'Update now',
        'Later (Wi-Fi)',
      )
      : await confirm(
        'New version available',
        `Update now${size ? ` (${size})` : ''}? You only need to tap Install.`,
        'Update',
        'Later',
      );

    if (!go) {
      await AsyncStorage.setItem(K_SNOOZE, JSON.stringify({ versionCode: info.versionCode, until: Date.now() + SNOOZE_MS }));
      return;
    }

    onProgress?.(0);
    try {
      await downloadAndInstall(info, onProgress);
    } catch (err) {
      Alert.alert('Update failed', err.message || 'Please try again.');
    } finally {
      onProgress?.(null);
    }
  } catch {
    // Offline or GitHub unreachable — try again at the next check.
  } finally {
    busy = false;
  }
}
