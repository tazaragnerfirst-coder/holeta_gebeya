import { StyleSheet, Text, View } from 'react-native';
import ScreenShell from '../components/ScreenShell';
import Icon from '../components/Icon';
import { colors, font } from '../theme';

// The full policy text is not published yet (same placeholder as the web app).
export default function PrivacyScreen({ onBack }) {
  return (
    <ScreenShell title="Privacy Policy" onBack={onBack}>
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Icon name="lock" size={26} color={colors.inkFaint} />
        </View>
        <Text style={styles.emptyTitle}>Coming soon</Text>
        <Text style={styles.emptySub}>Our full privacy policy will be published here.</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceSunken,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontFamily: font.familyExtraBold, fontSize: 15, color: colors.ink },
  emptySub: {
    marginTop: 6, fontFamily: font.family, fontSize: 12.5, color: colors.inkFaint,
    textAlign: 'center', lineHeight: 19, maxWidth: 260,
  },
});
