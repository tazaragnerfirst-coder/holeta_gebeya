import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { sheetUi } from './BottomSheet';
import Icon from './Icon';
import { colors, font } from '../theme';

// Mirrors frontend/src/components/CallSheet.jsx.
// expo-clipboard is not in package.json, so "Copy number" opens the system
// share sheet with the number until that dependency is added.
export default function CallSheet({ open, phone, sellerName, onClose }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await Share.share({ message: phone });
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <BottomSheet open={open} title={sellerName || 'Seller'} onClose={onClose} dismissOnOverlay>
      <Text style={styles.number}>{phone}</Text>
      <View style={sheetUi.actions}>
        <Pressable style={[sheetUi.btn, sheetUi.primary]} onPress={() => Linking.openURL(`tel:${phone}`)} accessibilityRole="button">
          <Icon name="phone" size={16} color={colors.white} />
          <Text style={sheetUi.primaryText}>Call now</Text>
        </Pressable>
        <Pressable style={[sheetUi.btn, sheetUi.outline]} onPress={copy} accessibilityRole="button">
          <Text style={sheetUi.outlineText}>{copied ? 'Copied!' : 'Copy number'}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  number: {
    fontFamily: font.familyExtraBold, fontSize: 22, color: colors.ink, textAlign: 'center',
    letterSpacing: 0.5, marginTop: 6, marginBottom: 18,
  },
});
