import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import BottomSheet, { sheetUi } from './BottomSheet';
import Icon from './Icon';
import { colors } from '../theme';

// Mirrors frontend/src/components/ReviewSheet.jsx.
export default function ReviewSheet({ open, busy, error, initial, onClose, onSubmit }) {
  const [rating, setRating] = useState(initial?.rating || 5);
  const [comment, setComment] = useState(initial?.comment || '');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(initial?.rating || 5);
      setComment(initial?.comment || '');
      setTouched(false);
    }
  }, [open, initial]);

  function submit() {
    setTouched(true);
    if (!rating || !comment.trim()) return;
    onSubmit({ rating, comment: comment.trim() });
  }

  return (
    <BottomSheet open={open} title="Rate this seller" onClose={onClose} closeLabel="Cancel">
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} accessibilityLabel={`${n} stars`} style={{ padding: 2 }}>
            <Icon name="star" size={30} weight={n <= rating ? 'fill' : 'regular'} color={n <= rating ? colors.accent : colors.line} />
          </Pressable>
        ))}
      </View>

      <View style={{ marginTop: 16 }}>
        <Text style={sheetUi.label}>Comment<Text style={sheetUi.req}>*</Text></Text>
        <TextInput
          style={sheetUi.field}
          value={comment}
          onChangeText={setComment}
          placeholder="How was your experience with this seller?"
          placeholderTextColor={colors.inkFaint}
          multiline
        />
      </View>

      {touched && !rating ? <Text style={sheetUi.fieldError}>Please pick a star rating.</Text> : null}
      {touched && rating && !comment.trim() ? <Text style={sheetUi.fieldError}>Please add a short comment.</Text> : null}
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
          <Text style={sheetUi.primaryText}>{busy ? 'Submitting…' : 'Submit review'}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
