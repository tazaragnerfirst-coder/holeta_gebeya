import { Text, View } from 'react-native';
import ScreenShell, { ui } from '../components/ScreenShell';

// Same content as the web Settings: language is part of Premium and not available yet.
export default function SettingsScreen({ onBack }) {
  return (
    <ScreenShell title="Settings" onBack={onBack}>
      <View style={ui.txRow}>
        <Text style={ui.txLabel}>Change language</Text>
        <Text style={ui.txDate}>Premium</Text>
      </View>
      <Text style={[ui.muted, { marginTop: 12 }]}>More languages are part of Subscription — coming soon.</Text>
    </ScreenShell>
  );
}
