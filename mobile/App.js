import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from '@firebase/auth';
import { auth } from './src/lib/firebase';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  // undefined = still checking the saved session, null = logged out
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  let screen;
  if (user === undefined) {
    screen = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F7052" />
      </View>
    );
  } else if (user === null) {
    screen = <LoginScreen />;
  } else {
    screen = <HomeScreen />;
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
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
