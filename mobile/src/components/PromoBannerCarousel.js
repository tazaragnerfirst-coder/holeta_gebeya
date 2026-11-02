import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { radius } from '../theme';

const AUTO_ADVANCE_MS = 4500;

// Mirrors frontend/src/components/PromoBannerCarousel.jsx: 970:250 slides,
// auto-advance (paused while touching), dots, tap opens linkUrl.
export default function PromoBannerCarousel({ banners }) {
  const count = banners.length;
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);
  const pausedRef = useRef(false);
  const indexRef = useRef(0);

  function goTo(i, animated = true) {
    indexRef.current = i;
    setIndex(i);
    if (width > 0) scrollRef.current?.scrollTo({ x: i * width, animated });
  }

  useEffect(() => {
    if (count <= 1 || width === 0) return undefined;
    const t = setInterval(() => {
      if (!pausedRef.current) goTo((indexRef.current + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [count, width]);

  function onScrollEnd(e) {
    pausedRef.current = false;
    if (width === 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    indexRef.current = i;
    setIndex(i);
  }

  function open(url) {
    if (!url || url.startsWith('/')) return; // in-app paths have no native route
    Linking.openURL(url).catch(() => {});
  }

  if (count === 0) return null;

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => { pausedRef.current = true; }}
          onMomentumScrollEnd={onScrollEnd}
        >
          {banners.map((b) => (
            <Pressable key={b.id} onPress={() => open(b.linkUrl)} accessibilityRole="button" accessibilityLabel="Promo banner">
              <Image source={{ uri: b.imageUrl }} style={{ width, aspectRatio: 970 / 250 }} resizeMode="cover" />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.sizer} />
      )}
      {count > 1 ? (
        <View style={styles.dots} pointerEvents="box-none">
          {banners.map((b, i) => (
            <Pressable key={b.id} onPress={() => goTo(i)} hitSlop={6} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 14, borderRadius: radius.lg, overflow: 'hidden' },
  sizer: { width: '100%', aspectRatio: 970 / 250 },
  dots: { position: 'absolute', left: 0, right: 0, bottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { width: 16, backgroundColor: '#fff' },
});
