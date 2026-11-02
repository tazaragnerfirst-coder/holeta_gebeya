import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

// Mirrors theme.css .skeleton-shimmer: sunken block with a light band
// sweeping left to right every 1.3s.
export function Shimmer({ style }) {
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  return (
    <View style={[styles.base, style]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.band, {
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-w, w] }) }],
          }]}
        />
      ) : null}
    </View>
  );
}

// Same shape as ListingCard (4:5 thumb + three lines) — web ListingCardSkeleton.
export function ListingCardSkeleton() {
  return (
    <View style={styles.card}>
      <Shimmer style={styles.thumb} />
      <View style={styles.body}>
        <Shimmer style={{ width: '40%', height: 13, borderRadius: 6 }} />
        <Shimmer style={{ width: '80%', height: 12, borderRadius: 6, marginTop: 8 }} />
        <Shimmer style={{ width: '55%', height: 10, borderRadius: 6, marginTop: 8 }} />
      </View>
    </View>
  );
}

// Two-column grid of skeleton cards, matching Home's 6px edge margin and gap.
export function ListingGridSkeleton({ count = 6 }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }, (_, i) => <ListingCardSkeleton key={i} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surfaceSunken, overflow: 'hidden' },
  band: { backgroundColor: 'rgba(255,255,255,0.55)', width: '100%' },
  card: { width: '48.5%' },
  thumb: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.md },
  body: { paddingHorizontal: 11, paddingTop: 10, paddingBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 6, rowGap: 6 },
});
