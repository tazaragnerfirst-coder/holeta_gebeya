import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth } from '../lib/firebase';
import { getMyProfile, updateMyProfile } from '../lib/profile';
import { useEffectOnce } from '../lib/hooks';

// Edit name, phone and location (same fields and rules as the web Edit Info sheet).
export default function EditProfileScreen({ onBack }) {
  const uid = auth.currentUser?.uid;
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffectOnce(() => {
    if (!uid) return;
    getMyProfile(uid).then((p) => {
      setFullName(p.name && p.name !== 'User' ? p.name : '');
      setPhone(p.phone || '');
      setLocation(p.location || '');
      setLoading(false);
    });
  });

  async function save() {
    if (busy) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await updateMyProfile({ fullName, phone, location });
      setSaved(true);
    } catch (err) {
      setError(err.message || "Couldn't save your details.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F7052" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Edit info</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="Full name *" value={fullName} onChangeText={setFullName} placeholder="e.g. Abebe Kebede" />
        <Field label="Business phone number *" value={phone} onChangeText={setPhone} placeholder="09XXXXXXXX" keyboardType="phone-pad" />
        <Field label="Location (optional)" value={location} onChangeText={setLocation} placeholder="e.g. Holeta, Oromia" />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.success}>Saved.</Text> : null}

        <Pressable onPress={save} disabled={busy} accessibilityRole="button" style={[styles.saveButton, busy && styles.disabled]}>
          <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({ label, ...inputProps }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, fontWeight: '600', color: '#4F7052' },
  title: { marginTop: 4, fontSize: 18, fontWeight: '700', color: '#1F1F1F' },
  form: { padding: 16, paddingBottom: 32 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#1F1F1F', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#D0D4D8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1F1F1F',
  },
  error: { marginBottom: 10, fontSize: 14, color: '#B3261E' },
  success: { marginBottom: 10, fontSize: 14, color: '#4F7052', fontWeight: '600' },
  saveButton: {
    marginTop: 6, backgroundColor: '#4F7052', paddingVertical: 13,
    borderRadius: 10, alignItems: 'center',
  },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
