import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { signInWithCustomToken } from '@firebase/auth';
import { auth, BACKEND_URL } from '../lib/firebase';
import Icon from '../components/Icon';
import { colors, font, radius } from '../theme';

// Telegram login for the native app. Same flow as the web's
// BrowserLoginSheet: the app shows a 4-digit code, the user opens the
// bot and confirms that same code, and the app polls until it gets a
// Firebase custom token for the existing `tg_<id>` account.
const POLL_MS = 2000;

async function post(path, body) {
  const r = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
}

export default function LoginScreen() {
  const [state, setState] = useState({ status: 'starting', code: '', botLink: '', error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    setState({ status: 'starting', code: '', botLink: '', error: '' });

    async function poll(nonce) {
      if (cancelled) return;
      try {
        const data = await post('/authPoll', { nonce });
        if (cancelled) return;
        if (data.status === 'ok') {
          // Auth state change in App.js switches the screen; this
          // component unmounts and `cancelled` stops any further polls.
          await signInWithCustomToken(auth, data.token);
          return;
        }
        if (data.status === 'expired') {
          setState((s) => ({ ...s, status: 'expired' }));
          return;
        }
      } catch {
        // transient network error: keep polling
      }
      timer = setTimeout(() => poll(nonce), POLL_MS);
    }

    post('/authStart', {})
      .then((d) => {
        if (cancelled) return;
        setState({ status: 'waiting', code: d.code, botLink: d.botLink, error: '' });
        poll(d.nonce);
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', code: '', botLink: '', error: err.message || "Couldn't start login." });
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt]);

  const { status, code, botLink, error } = state;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon name="send" size={26} color={colors.primary} />
      </View>
      <Text style={styles.title}>Log in with Telegram</Text>

      {status === 'starting' && (
        <Text style={styles.text}>Preparing your login… (first time can take up to 30s)</Text>
      )}

      {status === 'waiting' && (
        <>
          <Text style={styles.text}>
            1. Tap the button and press Start in Telegram.{'\n'}
            2. Check the code there matches this one, then tap Confirm login.{'\n'}
            3. Come back here. You'll be logged in automatically.
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.code} accessibilityLabel={`Login code ${code}`}>{code}</Text>
          </View>
          <Text style={styles.text}>Waiting for confirmation…</Text>
          <Pressable
            style={styles.button}
            onPress={() => Linking.openURL(botLink).catch(() => {})}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Open Telegram</Text>
          </Pressable>
        </>
      )}

      {(status === 'expired' || status === 'error') && (
        <>
          <Text style={styles.error}>
            {status === 'expired' ? 'This login expired. Tap Try again to get a new one.' : error}
          </Text>
          <Pressable style={styles.button} onPress={() => setAttempt((n) => n + 1)} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bgApp, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontFamily: font.familyExtraBold, fontSize: 20, color: colors.ink, marginBottom: 12 },
  text: {
    fontFamily: font.family, fontSize: 13.5, lineHeight: 22, color: colors.inkSoft,
    textAlign: 'center', marginVertical: 8,
  },
  codeBox: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: 28, paddingVertical: 10, marginVertical: 12,
  },
  code: { fontFamily: font.familyExtraBold, fontSize: 36, letterSpacing: 8, color: colors.primary },
  error: { fontFamily: font.familyMedium, fontSize: 13.5, color: colors.safety, textAlign: 'center', marginBottom: 16 },
  button: {
    marginTop: 16, backgroundColor: colors.primary, paddingVertical: 13, paddingHorizontal: 32, borderRadius: 14,
  },
  buttonText: { color: colors.white, fontFamily: font.familyBold, fontSize: 14 },
});
