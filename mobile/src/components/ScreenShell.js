import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, font, radius } from '../theme';

// Common frame for sub-screens: back button, title, scrollable body.
// Mirrors the web app's .page / .page-title layout (frontend/src/styles/theme.css).
export default function ScreenShell({ title, onBack, children, scroll = true }) {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" hitSlop={8} style={styles.backButton}>
            <Icon name="chevronLeft" size={20} color={colors.ink} />
          </Pressable>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      ) : (
        <View style={styles.flex}>{children}</View>
      )}
    </View>
  );
}

// Shared building blocks, styled to match the web app's card/button/
// input system (theme.css: .stat-card, .chart-card, .field, .btn-*).
export const ui = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, padding: 14, marginBottom: 14,
  },
  cardLabel: { fontFamily: font.family, fontSize: 12.5, color: colors.inkFaint },
  cardValue: { marginTop: 4, fontFamily: font.familyExtraBold, fontSize: 26, color: colors.primary },
  cardSub: { marginTop: 4, fontFamily: font.family, fontSize: 12.5, color: colors.inkFaint },
  sectionTitle: { marginBottom: 10, fontFamily: font.familyBold, fontSize: 15, color: colors.ink },
  muted: { fontFamily: font.family, fontSize: 13, color: colors.inkFaint, lineHeight: 20 },
  error: { marginVertical: 8, fontFamily: font.familyMedium, fontSize: 13, color: colors.safety },
  success: { marginVertical: 8, fontFamily: font.familyBold, fontSize: 13, color: colors.primary },
  input: {
    borderWidth: 1.5, borderColor: colors.line, borderRadius: 12,
    paddingHorizontal: 13, paddingVertical: 12, fontFamily: font.family, fontSize: 14,
    color: colors.ink, marginBottom: 10, backgroundColor: colors.surface,
  },
  primary: {
    backgroundColor: colors.primary, paddingVertical: 13, borderRadius: 14, alignItems: 'center', marginTop: 4,
  },
  primaryText: { color: colors.white, fontFamily: font.familyBold, fontSize: 14 },
  secondary: {
    backgroundColor: colors.primaryTint, paddingVertical: 13, borderRadius: 14, alignItems: 'center',
  },
  secondaryText: { color: colors.primary, fontFamily: font.familyBold, fontSize: 14 },
  disabled: { opacity: 0.5 },
  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  txLabel: { fontFamily: font.familySemiBold, fontSize: 13.5, color: colors.ink },
  txDate: { marginTop: 2, fontFamily: font.family, fontSize: 11.5, color: colors.inkFaint },
  pos: { fontFamily: font.familyBold, fontSize: 13.5, color: colors.ok },
  neg: { fontFamily: font.familyBold, fontSize: 13.5, color: colors.safety },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: Platform.OS === 'ios' ? 56 : 48, paddingHorizontal: 16, paddingBottom: 12,
  },
  backButton: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: font.familyExtraBold, fontSize: 20, color: colors.ink },
  body: { paddingHorizontal: 16, paddingBottom: 120 },
});
