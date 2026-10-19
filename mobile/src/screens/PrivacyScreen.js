import { Text } from 'react-native';
import ScreenShell, { ui } from '../components/ScreenShell';

// The full policy text is not published yet (same placeholder as the web app).
export default function PrivacyScreen({ onBack }) {
  return (
    <ScreenShell title="Privacy policy" onBack={onBack}>
      <Text style={ui.sectionTitle}>Coming soon</Text>
      <Text style={ui.muted}>Our full privacy policy will be published here.</Text>
    </ScreenShell>
  );
}
