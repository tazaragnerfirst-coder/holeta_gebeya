import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CONDITIONS } from '../lib/search';

// Search field with suggestions, recent searches and popular tags.
// Mirrors frontend/src/components/SearchHeader.jsx.
export function SearchBar({
  value, onChange, onSubmit, suggestions = [], recent = [], popularTags = [], onClearRecent, filterCount = 0, onOpenFilters,
}) {
  const [focused, setFocused] = useState(false);
  const term = value.trim();
  const typing = focused && term.length > 0;
  const idle = focused && term.length === 0 && (recent.length > 0 || popularTags.length > 0);

  function commit(t) {
    onChange(t);
    onSubmit?.(t);
    setFocused(false);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <TextInput
          style={styles.input}
          placeholder="Search listings..."
          placeholderTextColor="#9AA0A6"
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => term && commit(value)}
          returnKeyType="search"
        />
        {value ? (
          <Pressable onPress={() => onChange('')} hitSlop={8}>
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onOpenFilters} style={styles.filterBtn} accessibilityRole="button" accessibilityLabel="Filters">
          <Text style={styles.filterText}>Filters{filterCount > 0 ? ` (${filterCount})` : ''}</Text>
        </Pressable>
      </View>

      {typing && suggestions.length > 0 ? (
        <View style={styles.panel}>
          {suggestions.slice(0, 6).map((s) => (
            <Pressable key={s} onPress={() => commit(s)} style={styles.suggestion}>
              <Text style={styles.suggestionText} numberOfLines={1}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : typing ? (
        <View style={styles.panel}>
          <Pressable onPress={() => commit(value)} style={styles.suggestion}>
            <Text style={styles.suggestionText}>Press search to find "{term}"</Text>
          </Pressable>
        </View>
      ) : null}

      {idle ? (
        <View style={styles.panel}>
          {recent.length > 0 ? (
            <>
              <View style={styles.panelHead}>
                <Text style={styles.panelTitle}>Recent searches</Text>
                <Pressable onPress={onClearRecent} hitSlop={8}>
                  <Text style={styles.link}>Clear all</Text>
                </Pressable>
              </View>
              <View style={styles.tags}>
                {recent.map((r) => (
                  <Pressable key={r} onPress={() => commit(r)} style={styles.tag}>
                    <Text style={styles.tagText}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          {popularTags.length > 0 ? (
            <>
              <Text style={[styles.panelTitle, { marginTop: 10 }]}>Popular in Holeta</Text>
              <View style={styles.tags}>
                {popularTags.map((t) => (
                  <Pressable key={t} onPress={() => commit(t)} style={[styles.tag, styles.tagAccent]}>
                    <Text style={[styles.tagText, styles.tagAccentText]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// Price range + condition filters, shown as a bottom sheet.
export function FilterModal({ visible, filters, onApply, onClose }) {
  const [minPrice, setMinPrice] = useState(filters.minPrice != null ? String(filters.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice != null ? String(filters.maxPrice) : '');
  const [conditions, setConditions] = useState(filters.conditions || []);

  function toggle(c) {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function apply() {
    onApply({
      minPrice: minPrice === '' ? null : Number(minPrice),
      maxPrice: maxPrice === '' ? null : Number(maxPrice),
      conditions,
    });
    onClose();
  }

  function reset() {
    setMinPrice('');
    setMaxPrice('');
    setConditions([]);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Filters</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.link}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <Text style={styles.label}>Price range (ETB)</Text>
          <View style={styles.priceRow}>
            <TextInput style={[styles.priceInput]} placeholder="Min" keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} />
            <Text style={styles.dash}>—</Text>
            <TextInput style={[styles.priceInput]} placeholder="Max" keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} />
          </View>

          <Text style={styles.label}>Condition</Text>
          <View style={styles.tags}>
            {CONDITIONS.map((c) => {
              const on = conditions.includes(c);
              return (
                <Pressable key={c} onPress={() => toggle(c)} style={[styles.tag, on && styles.tagOn]}>
                  <Text style={[styles.tagText, on && styles.tagOnText]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.sheetActions}>
          <Pressable onPress={reset} style={styles.ghost}>
            <Text style={styles.ghostText}>Reset</Text>
          </Pressable>
          <Pressable onPress={apply} style={styles.primary}>
            <Text style={styles.primaryText}>Apply filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 48, paddingBottom: 8, backgroundColor: '#FFFFFF', zIndex: 10 },
  bar: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D0D4D8',
    borderRadius: 12, paddingLeft: 12, paddingRight: 6, height: 44,
  },
  input: { flex: 1, fontSize: 15, color: '#1F1F1F', paddingVertical: 0 },
  clear: { fontSize: 15, color: '#9AA0A6', paddingHorizontal: 8 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 6, borderLeftWidth: 1, borderLeftColor: '#EEEEEE', marginLeft: 6 },
  filterText: { fontSize: 13, fontWeight: '700', color: '#4F7052' },
  panel: {
    marginTop: 6, borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 12,
    backgroundColor: '#FFFFFF', padding: 10,
  },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontSize: 12, fontWeight: '700', color: '#5F6368', marginBottom: 6 },
  suggestion: { paddingVertical: 8 },
  suggestionText: { fontSize: 14, color: '#1F1F1F' },
  link: { fontSize: 13, fontWeight: '600', color: '#4F7052' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F4F5F7' },
  tagText: { fontSize: 13, color: '#1F1F1F' },
  tagAccent: { backgroundColor: '#EEF5EE' },
  tagAccentText: { color: '#4F7052', fontWeight: '600' },
  tagOn: { backgroundColor: '#4F7052' },
  tagOnText: { color: '#FFFFFF', fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingBottom: 24 },
  sheetHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1F1F1F' },
  sheetBody: { padding: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#5F6368', marginTop: 10, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInput: {
    flex: 1, borderWidth: 1, borderColor: '#D0D4D8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1F1F1F',
  },
  dash: { color: '#5F6368' },
  sheetActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  ghost: { flex: 1, borderWidth: 1, borderColor: '#4F7052', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  ghostText: { color: '#4F7052', fontSize: 15, fontWeight: '700' },
  primary: { flex: 2, backgroundColor: '#4F7052', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
