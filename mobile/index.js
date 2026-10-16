import { registerRootComponent } from 'expo';
import { Component } from 'react';
import { ScrollView, Text } from 'react-native';

// Diagnostic entry point: if the app crashes on startup or while
// rendering, show the error on screen instead of closing silently.

function ErrorScreen({ error }) {
  const message = error?.message || String(error);
  const stack = error?.stack || '';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#B3261E', marginBottom: 12 }}>App error</Text>
      <Text selectable style={{ fontSize: 14, color: '#1F1F1F', marginBottom: 12 }}>{message}</Text>
      <Text selectable style={{ fontSize: 11, color: '#5F6368' }}>{stack}</Text>
    </ScrollView>
  );
}

class RootBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) return <ErrorScreen error={this.state.error} />;
    return this.props.children;
  }
}

let Root;
try {
  // Loaded here (not with a top-level import) so that an error while
  // importing the app is caught and shown on screen too.
  const App = require('./App').default;
  Root = () => (
    <RootBoundary>
      <App />
    </RootBoundary>
  );
} catch (error) {
  Root = () => <ErrorScreen error={error} />;
}

registerRootComponent(Root);
