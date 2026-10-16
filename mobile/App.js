import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from '@firebase/auth';
import { auth } from './src/lib/firebase';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  // undefined = still checking the saved session, null = logged out
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

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
});
