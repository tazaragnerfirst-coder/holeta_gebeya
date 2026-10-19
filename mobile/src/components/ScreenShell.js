import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Common frame for sub-screens: back button, title, scrollable body.
export default function ScreenShell({ title, onBack, children, scroll = true }) {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
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

export const ui = StyleSheet.create({
  card: {
    backgroundColor: '#F4F8F4', borderRadius: 14, padding: 16, marginBottom: 16,
  },
  cardLabel: { fontSize: 13, color: '#5F6368' },
  cardValue: { marginTop: 4, fontSize: 28, fontWeight: '700', color: '#4F7052' },
  cardSub: { marginTop: 4, fontSize: 13, color: '#5F6368' },
  sectionTitle: { marginTop: 8, marginBottom: 8, fontSize: 15, fontWeight: '700', color: '#1F1F1F' },
  muted: { fontSize: 14, color: '#5F6368', lineHeight: 21 },
  error: { marginVertical: 8, fontSize: 14, color: '#B3261E' },
  success: { marginVertical: 8, fontSize: 14, fontWeight: '600', color: '#4F7052' },
  input: {
    borderWidth: 1, borderColor: '#D0D4D8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1F1F1F', marginBottom: 10,
  },
  primary: {
    backgroundColor: '#4F7052', paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginTop: 4,
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondary: {
    borderWidth: 1, borderColor: '#4F7052', paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },
  secondaryText: { color: '#4F7052', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  txLabel: { fontSize: 14, fontWeight: '600', color: '#1F1F1F' },
  txDate: { marginTop: 2, fontSize: 12, color: '#5F6368' },
  pos: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  neg: { fontSize: 14, fontWeight: '700', color: '#B3261E' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  topBar: {
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '600', color: '#4F7052' },
  title: { marginTop: 4, fontSize: 18, fontWeight: '700', color: '#1F1F1F' },
  body: { padding: 16, paddingBottom: 40 },
});
