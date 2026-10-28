import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, font } from '../theme';

// Native twin of the web .sheet / .sheet-overlay (theme.css): dim overlay,
// 22px top radius, 36x4 handle, 16.5/800 title with a round close button.
// `onClose` handles the Android back button and the X; `dismissOnOverlay`
// also closes on an overlay tap (web: only the Call sheet does that).
export default function BottomSheet({ open, title, onClose, dismissOnOverlay = false, closeLabel = 'Close', children }) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Pressable style={styles.overlay} onPress={dismissOnOverlay ? onClose : undefined}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} style={styles.iconBtn}>
                <Icon name="x" size={18} color={colors.inkSoft} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>{children}</ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Shared sheet pieces (web .sheet-actions / .field / .field-label / .field-error).
export const sheetUi = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  ghost: { backgroundColor: colors.surfaceSunken },
  ghostText: { color: colors.inkSoft, fontFamily: font.familyBold, fontSize: 14 },
  primary: { backgroundColor: colors.primary },
  primaryText: { color: colors.white, fontFamily: font.familyBold, fontSize: 14 },
  outline: { backgroundColor: colors.primaryTint },
  outlineText: { color: colors.primary, fontFamily: font.familyBold, fontSize: 14 },
  disabled: { opacity: 0.6 },
  label: { fontFamily: font.familyBold, fontSize: 12.5, color: colors.inkSoft, marginBottom: 7 },
  req: { color: colors.safety },
  field: {
    borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12,
    fontFamily: font.family, fontSize: 14, backgroundColor: colors.surface, color: colors.ink,
    minHeight: 84, textAlignVertical: 'top',
  },
  fieldError: { fontFamily: font.familyMedium, fontSize: 11.5, color: colors.safety, marginTop: 6, lineHeight: 16 },
  errorBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.safetyTint,
    borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, marginTop: 14,
  },
  errorText: { flex: 1, fontFamily: font.familyMedium, fontSize: 12, color: colors.safety },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(20,22,18,.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 8, paddingHorizontal: 18, paddingBottom: 18, maxHeight: '85%',
  },
  handle: { width: 36, height: 4, borderRadius: 100, backgroundColor: colors.line, alignSelf: 'center', marginTop: 6, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontFamily: font.familyExtraBold, fontSize: 16.5, color: colors.ink },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
});
