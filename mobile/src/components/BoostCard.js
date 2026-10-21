import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import { colors, font, radius } from '../theme';

// Mirrors frontend/src/components/BoostCard.jsx — same accent
// gradient, compare bars and pill CTA.
export default function BoostCard({
  title = 'Boost your reach', description, compare, ctaLabel = 'Boost an ad', onPress, busy,
}) {
  const max = compare && compare.length > 0 ? Math.max(...compare.map((c) => c.value), 0.1) : 0;

  return (
    <LinearGradient colors={[colors.accent, colors.accentDark]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.card}>
      <View style={styles.top}>
        <Icon name="trendingUp" size={13} color="rgba(255,255,255,0.85)" weight="bold" />
        <Text style={styles.topText}>BOOST</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}

      {compare && compare.length > 0 ? (
        <View style={styles.compareRow}>
          {compare.map((c) => (
            <View key={c.label} style={styles.compareItem}>
              <Text style={styles.compareNum}>{c.value}</Text>
              <Text style={styles.compareLabel}>{c.label}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max((c.value / max) * 100, 4)}%` }]} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable onPress={onPress} disabled={busy} style={styles.cta} accessibilityRole="button">
        <Icon name="star" size={13} color={colors.white} weight="fill" />
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, marginBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  topText: {
    fontFamily: font.familyExtraBold, fontSize: 11.5, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.6,
  },
  title: { marginTop: 6, marginBottom: 12, fontFamily: font.familyBold, fontSize: 14, color: colors.white },
  desc: { marginTop: -6, marginBottom: 12, fontFamily: font.family, fontSize: 12.5, color: 'rgba(255,255,255,0.88)', lineHeight: 18 },
  compareRow: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  compareItem: { flex: 1 },
  compareNum: { fontFamily: font.familyExtraBold, fontSize: 17, color: colors.white },
  compareLabel: { marginTop: 1, fontFamily: font.familySemiBold, fontSize: 10.5, color: 'rgba(255,255,255,0.75)' },
  track: { marginTop: 6, height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 999, backgroundColor: colors.white },
  cta: {
    flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
  },
  ctaText: { fontFamily: font.familyBold, fontSize: 12.5, color: colors.white },
});
