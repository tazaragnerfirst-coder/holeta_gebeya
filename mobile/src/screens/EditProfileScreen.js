import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth } from '../lib/firebase';
import { getMyProfile, updateMyProfile } from '../lib/profile';
import { useEffectOnce } from '../lib/hooks';
import ScreenShell, { ui } from '../components/ScreenShell';
import { colors, font } from '../theme';

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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenShell title="Edit info" onBack={onBack}>
      <Field label="Full name *" value={fullName} onChangeText={setFullName} placeholder="e.g. Abebe Kebede" />
      <Field label="Business phone number *" value={phone} onChangeText={setPhone} placeholder="09XXXXXXXX" keyboardType="phone-pad" />
      <Field label="Location (optional)" value={location} onChangeText={setLocation} placeholder="e.g. Holeta, Oromia" />

      {error ? <Text style={ui.error}>{error}</Text> : null}
      {saved ? <Text style={ui.success}>Saved.</Text> : null}

      <Pressable onPress={save} disabled={busy} accessibilityRole="button" style={[ui.primary, busy && ui.disabled]}>
        <Text style={ui.primaryText}>{busy ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </ScreenShell>
  );
}

function Field({ label, ...inputProps }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[ui.input, { marginBottom: 0 }]} placeholderTextColor={colors.inkFaint} {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgApp },
  field: { marginBottom: 14 },
  label: { fontFamily: font.familySemiBold, fontSize: 13, color: colors.ink, marginBottom: 6 },
});
