import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from '@firebase/auth';
import { auth } from './src/lib/firebase';
import { checkForUpdate, downloadAndInstall } from './src/lib/update';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  // undefined = still checking the saved session, null = logged out
  const [user, setUser] = useState(undefined);
  const [update, setUpdate] = useState(null); // newer build found, not yet answered
  const [progress, setProgress] = useState(null); // 0..1 while downloading

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Check for a newer build on launch and whenever the app comes back to the foreground.
  useEffect(() => {
    let active = true;
    const run = () => {
      checkForUpdate()
        .then((info) => { if (active && info) setUpdate(info); })
        .catch(() => {}); // offline or GitHub unreachable: try again later
    };
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!update || progress !== null) return;
    Alert.alert(
      'New version available',
      'Update now? It takes a moment and you only need to tap Install.',
      [
        { text: 'Later', style: 'cancel', onPress: () => setUpdate(null) },
        { text: 'Update', onPress: () => startUpdate(update) },
      ],
      { cancelable: false },
    );
    // startUpdate is stable enough for this one-shot prompt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  function startUpdate(info) {
    setProgress(0);
    downloadAndInstall(info, setProgress)
      .catch((err) => Alert.alert('Update failed', err.message || 'Please try again.'))
      .finally(() => {
        setProgress(null);
        setUpdate(null);
      });
  }

  let screen;
  if (user === undefined) {
    screen = <ActivityIndicator size="large" color="#4F7052" />;
  } else if (user === null) {
    screen = <LoginScreen />;
  } else {
    screen = (
      <>
        <Text style={styles.title}>Holeta Gebeya</Text>
        <Text style={styles.subtitle}>Logged in. Home screen coming next.</Text>
      </>
    );
  }

  return (
    <View style={styles.container}>
      {screen}
      {progress !== null && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#4F7052" />
          <Text style={styles.overlayText}>Downloading update… {Math.round(progress * 100)}%</Text>
        </View>
      )}
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#5F6368',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: {
    marginTop: 12,
    fontSize: 14,
    color: '#1F1F1F',
  },
});
