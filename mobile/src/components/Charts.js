import { StyleSheet, Text, View } from 'react-native';

// Plain-View charts (no chart library), matching the web Dashboard.

// data: [{ date: 'YYYY-MM-DD', value: number }], ascending.
export function DailyBars({ data, height = 120 }) {
  if (!data || data.length === 0) {
    return <Text style={styles.empty}>No views recorded yet for this period.</Text>;
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
                { height: Math.max((d.value / max) * (height - 8), d.value > 0 ? 3 : 1), backgroundColor: d.value > 0 ? '#4F7052' : '#E0E0E0' },
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
    <View>
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
  empty: { fontSize: 13, color: '#5F6368', paddingVertical: 8 },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barCol: { flex: 1, justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%', borderRadius: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisText: { fontSize: 11, color: '#5F6368' },
  rankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rankLabel: { width: 110, fontSize: 13, color: '#1F1F1F' },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#EEF2EE', marginHorizontal: 8, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: '#4F7052' },
  rankValue: { width: 36, textAlign: 'right', fontSize: 13, fontWeight: '700', color: '#4F7052' },
});
