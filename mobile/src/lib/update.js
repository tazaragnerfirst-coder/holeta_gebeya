import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

// CI publishes version.json next to the APK on the same release
// (see .github/workflows/build-mobile-apk.yml). Its versionCode is the
// workflow run number, which is also the installed build's versionCode.
const VERSION_URL =
  'https://github.com/tazaragnerfirst-coder/holeta_gebeya/releases/download/mobile-apk-latest/version.json';

// Returns the update info when a newer build exists, otherwise null.
export async function checkForUpdate() {
  if (Platform.OS !== 'android') return null;

  const current = Number(Application.nativeBuildVersion);
  if (!Number.isFinite(current)) return null;

  const r = await fetch(VERSION_URL, { cache: 'no-store' });
  if (!r.ok) return null;

  const info = await r.json();
  if (typeof info.versionCode !== 'number' || typeof info.url !== 'string') return null;
  return info.versionCode > current ? info : null;
}

// Downloads the APK into the app cache and hands it to Android's
// installer. The user still taps Install; Android does not allow an app
// to install itself silently. Same keystore and package name, so the
// install replaces the old build and keeps the app's data.
export async function downloadAndInstall(info, onProgress) {
  const dest = new File(Paths.cache, 'HoletaGebeya-update.apk');
  if (dest.exists) dest.delete();

  const task = File.createDownloadTask(info.url, dest, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (onProgress && totalBytes > 0) onProgress(bytesWritten / totalBytes);
    },
  });
  const file = await task.downloadAsync();
  if (!file) throw new Error('Download failed. Check your connection and try again.');

  const contentUri = await getContentUriAsync(file.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}
