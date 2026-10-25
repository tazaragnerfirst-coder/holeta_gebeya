import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';

// Plain-View charts (no chart library), styled to match
// frontend/src/components/DailyViewsChart.jsx and RankedBarChart.jsx.

// data: [{ date: 'YYYY-MM-DD', value: number }], ascending.
export function DailyBars({ data, height = 120 }) {
  if (!data || data.length === 0) {
    return <Text style={styles.empty}>No views yet in this period.</Text>;
  }
  const max = Math.max(1, ...data.map((d) => d.value));
  // Keep the bars readable on a phone: show at most ~30 of them.
  const shown = data.length > 30 ? data.slice(-30) : data;
  return (
    <View>
      <View style={[styles.barRow, { height }]}>
        {shown.map((d) => (
          <View key={d.date} style={styles.barCol}>
            <View
              style={[
                styles.bar,
                { height: Math.max((d.value / max) * (height - 8), d.value > 0 ? 3 : 1) },
                d.value > 0 ? styles.barFilled : styles.barEmpty,
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{shown[0].date.slice(5)}</Text>
        <Text style={styles.axisText}>{shown[shown.length - 1].date.slice(5)}</Text>
      </View>
    </View>
  );
}

// items: [{ id, label, value }]. Shows the top `limit` with value > 0.
export function RankedBars({ items, limit = 5, emptyText = 'Nothing to show yet.' }) {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value).slice(0, limit);
  if (sorted.length === 0) return <Text style={styles.empty}>{emptyText}</Text>;
  const max = sorted[0].value;
  return (
    <View style={styles.rankList}>
      {sorted.map((item) => (
        <View key={item.id || item.label} style={styles.rankRow}>
          <Text style={styles.rankLabel} numberOfLines={1}>{item.label}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max((item.value / max) * 100, 6)}%` }]} />
          </View>
          <Text style={styles.rankValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: font.familyMedium, fontSize: 12.5, color: colors.inkFaint, paddingVertical: 8, textAlign: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barCol: { flex: 1, justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%', borderRadius: 2 },
  barFilled: { backgroundColor: colors.primary },
  barEmpty: { backgroundColor: colors.line },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  axisText: { fontFamily: font.family, fontSize: 10.5, color: colors.inkFaint },
  rankList: { gap: 10 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingHorizontal: 4 },
  rankLabel: { width: 84, fontFamily: font.familySemiBold, fontSize: 11.5, color: colors.inkSoft },
  track: {
    flex: 1, height: 14, borderRadius: 999, backgroundColor: colors.bgApp,
    marginHorizontal: 8, overflow: 'hidden',
  },
  fill: { height: 14, borderRadius: 999, backgroundColor: colors.primary },
  rankValue: { width: 30, textAlign: 'right', fontFamily: font.familyExtraBold, fontSize: 11.5, color: colors.ink },
});
