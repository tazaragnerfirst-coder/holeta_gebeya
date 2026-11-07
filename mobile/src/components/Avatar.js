import { Image, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { getAvatarColor, getInitial } from '../lib/avatar';
import { colors, font } from '../theme';

// Chat avatar (web .chat-thumb.avatar-circle / .thumb-mini): profile photo,
// else a colored circle with the initial; `support` shows the help icon.
export default function Avatar({ name, photo, size = 50, fontSize = 17, support = false, iconSize = 20 }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (support) {
    return (
      <View style={[styles.center, box, { backgroundColor: colors.primaryTint }]}>
        <Icon name="helpCircle" size={iconSize} color={colors.primary} />
      </View>
    );
  }
  if (photo) return <Image source={{ uri: photo }} style={[box, { backgroundColor: colors.surfaceSunken }]} />;
  return (
    <View style={[styles.center, box, { backgroundColor: getAvatarColor(name) }]}>
      <Text style={[styles.initial, { fontSize }]}>{getInitial(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { color: '#fff', fontFamily: font.familyExtraBold },
});
