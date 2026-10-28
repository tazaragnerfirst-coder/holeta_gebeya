import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import BottomSheet, { sheetUi } from './BottomSheet';
import Icon from './Icon';
import { colors, font } from '../theme';

const REASONS = ['Prohibited item', 'Looks like a scam', 'Wrong category', 'Offensive content', 'Other'];

// Mirrors frontend/src/components/ReportSheet.jsx.
export default function ReportSheet({ open, busy, error, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setNote('');
      setTouched(false);
    }
  }, [open]);

  function submit() {
    setTouched(true);
    if (!reason) return;
    onSubmit({ reason, note: note.trim() });
  }

  return (
    <BottomSheet open={open} title="Report this listing" onClose={onClose} closeLabel="Cancel">
      <Text style={sheetUi.label}>Reason<Text style={sheetUi.req}>*</Text></Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {REASONS.map((r) => {
          const on = reason === r;
          return (
            <Pressable
              key={r}
              onPress={() => setReason(r)}
              style={{
                backgroundColor: on ? colors.primary : colors.surface, borderWidth: 1,
                borderColor: on ? colors.primary : colors.line, borderRadius: 100,
                paddingVertical: 8, paddingHorizontal: 14,
              }}
            >
              <Text style={{ fontFamily: font.familySemiBold, fontSize: 12.5, color: on ? colors.white : colors.inkSoft }}>{r}</Text>
            </Pressable>
          );
        })}
      </View>
      {touched && !reason ? <Text style={sheetUi.fieldError}>Please choose a reason.</Text> : null}

      <View style={{ marginTop: 14 }}>
        <Text style={sheetUi.label}>Additional details (optional)</Text>
        <TextInput
          style={sheetUi.field}
          value={note}
          onChangeText={setNote}
          placeholder="Anything else we should know?"
          placeholderTextColor={colors.inkFaint}
          multiline
        />
      </View>

      {error ? (
        <View style={sheetUi.errorBanner}>
          <Icon name="x" size={14} color={colors.safety} />
          <Text style={sheetUi.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={[sheetUi.actions, { marginTop: 14 }]}>
        <Pressable style={[sheetUi.btn, sheetUi.ghost, busy && sheetUi.disabled]} onPress={onClose} disabled={busy}>
          <Text style={sheetUi.ghostText}>Cancel</Text>
        </Pressable>
        <Pressable style={[sheetUi.btn, sheetUi.primary, busy && sheetUi.disabled]} onPress={submit} disabled={busy}>
          <Text style={sheetUi.primaryText}>{busy ? 'Submitting…' : 'Submit report'}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
