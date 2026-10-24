import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenShell from '../components/ScreenShell';
import { colors, font, radius } from '../theme';

// Mirrors frontend/src/pages/PostTypeSelect.jsx (same types, same order).
// The per-type forms (bot's PostAd) are the next step; picking a type
// does not open one yet.
const POST_TYPES = [
  { key: 'product', label: 'Product' },
  { key: 'service', label: 'Service' },
  { key: 'job', label: 'Job' },
  { key: 'rent', label: 'Rent' },
];

export default function PostTypeScreen({ onBack }) {
  return (
    <ScreenShell title="Post an Ad" onBack={onBack}>
      <Text style={styles.label}>What are you posting?</Text>
      <View style={styles.list}>
        {POST_TYPES.map((t) => (
          <Pressable
            key={t.key}
            style={styles.card}
            accessibilityRole="button"
            onPress={() => Alert.alert('Coming next', `The ${t.label} form isn't in the app yet.`)}
          >
            <Text style={styles.cardText}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: font.familyBold, fontSize: 13, color: colors.ink },
  list: { marginTop: 12, gap: 10 },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingVertical: 16, paddingHorizontal: 18,
  },
  cardText: { fontFamily: font.familyBold, fontSize: 14, color: colors.ink },
});
