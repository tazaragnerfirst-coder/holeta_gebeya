import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';

// Login is skipped for now: the Home feed (public listings) is shown directly.
// Restore the login gate when login is wired back in.
export default function App() {
  return (
    <View style={styles.container}>
      <HomeScreen />
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
