import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CONDITIONS } from '../lib/search';
import Icon from './Icon';
import { colors, font, radius } from '../theme';

// Search field with suggestions, recent searches and popular tags.
// Mirrors frontend/src/components/SearchHeader.jsx (.search-bar pill + .filter-btn).
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
      <View style={[styles.bar, focused && styles.barFocused]}>
        <Icon name="search" size={18} color={colors.inkFaint} />
        <TextInput
          style={styles.input}
          placeholder="Search listings..."
          placeholderTextColor={colors.inkFaint}
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => term && commit(value)}
          returnKeyType="search"
        />
        {value ? (
          <Pressable onPress={() => onChange('')} hitSlop={8}>
            <Icon name="x" size={16} color={colors.inkFaint} />
          </Pressable>
        ) : null}
        <Pressable onPress={onOpenFilters} style={styles.filterBtn} accessibilityRole="button" accessibilityLabel="Filters">
          <Icon name="sliders" size={18} color={filterCount > 0 ? colors.tgActiveInk : colors.inkSoft} />
          {filterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {typing && suggestions.length > 0 ? (
        <View style={styles.panel}>
          {suggestions.slice(0, 6).map((s) => (
            <Pressable key={s} onPress={() => commit(s)} style={styles.suggestion}>
              <Icon name="search" size={15} color={colors.inkFaint} />
              <Text style={styles.suggestionText} numberOfLines={1}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : typing ? (
        <View style={styles.panel}>
          <Pressable onPress={() => commit(value)} style={styles.suggestion}>
            <Icon name="search" size={15} color={colors.inkFaint} />
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
            <Icon name="x" size={20} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <Text style={styles.label}>Price range (ETB)</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.priceInput}
              placeholder="Min"
              placeholderTextColor={colors.inkFaint}
              keyboardType="numeric"
              value={minPrice}
              onChangeText={setMinPrice}
            />
            <Text style={styles.dash}>—</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Max"
              placeholderTextColor={colors.inkFaint}
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
            />
          </View>

          <Text style={styles.label}>Condition</Text>
          <View style={styles.tags}>
            {CONDITIONS.map((c) => {
              const on = conditions.includes(c);
              return (
                <Pressable key={c} onPress={() => toggle(c)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipOnText]}>{c}</Text>
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
  wrap: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 4, backgroundColor: colors.bgApp, zIndex: 10 },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.tgSearch,
    borderRadius: radius.pill, paddingLeft: 16, paddingRight: 8, height: 48,
    borderWidth: 3, borderColor: 'transparent',
  },
  barFocused: { borderColor: colors.tgActive },
  input: { flex: 1, fontFamily: font.family, fontSize: 14, color: colors.ink, paddingVertical: 0 },
  filterBtn: {
    width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.tgBar,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.tgAccent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  filterBadgeText: { fontFamily: font.familyBold, fontSize: 10, color: colors.white },
  panel: {
    marginTop: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    backgroundColor: colors.bgApp, padding: 12,
  },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontFamily: font.familyBold, fontSize: 12, color: colors.inkSoft, marginBottom: 6 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  suggestionText: { flex: 1, fontFamily: font.family, fontSize: 14, color: colors.ink },
  link: { fontFamily: font.familySemiBold, fontSize: 13, color: colors.tgActiveInk },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surface },
  tagText: { fontFamily: font.family, fontSize: 13, color: colors.ink },
  tagAccent: { backgroundColor: colors.tgBar },
  tagAccentText: { fontFamily: font.familySemiBold, color: colors.tgActiveInk },
  // Filter chips: web .chip (surface bg, line border; active = primary).
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.familySemiBold, fontSize: 12.5, color: colors.inkSoft },
  chipOnText: { color: colors.white },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: colors.bgApp, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    maxHeight: '70%', paddingBottom: 24,
  },
  sheetHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  sheetTitle: { fontFamily: font.familyExtraBold, fontSize: 17, color: colors.ink },
  sheetBody: { padding: 16 },
  label: { fontFamily: font.familyBold, fontSize: 13, color: colors.inkSoft, marginTop: 10, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInput: {
    flex: 1, borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface,
    paddingHorizontal: 13, paddingVertical: 11, fontFamily: font.family, fontSize: 14, color: colors.ink,
  },
  dash: { color: colors.inkSoft },
  sheetActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  ghost: {
    flex: 1, backgroundColor: colors.primaryTint, borderRadius: 14, paddingVertical: 13, alignItems: 'center',
  },
  ghostText: { color: colors.primary, fontFamily: font.familyBold, fontSize: 14 },
  primary: { flex: 2, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: colors.white, fontFamily: font.familyBold, fontSize: 14 },
});
