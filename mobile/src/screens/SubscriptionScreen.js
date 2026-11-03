import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import ScreenShell, { ui } from '../components/ScreenShell';
import { useAppData } from '../lib/appData';
import { formatExpiry, isSubscriptionActive } from '../lib/profile';
import { spendWallet } from '../lib/wallet';
import { SUBSCRIPTION_PERIOD_DAYS, SUBSCRIPTION_PRICE_ETB } from '../lib/constants';

const PERKS = [
  ['Verified Premium badge', 'Shown on your profile and listings'],
  ['Discounted boosts', 'Lower price every time you boost an ad'],
  ['Priority placement', 'Your ads stand out in search and category pages'],
  ['More photos per listing', 'Higher photo limit than the free plan'],
  ['Multiple languages', 'Coming with the Amharic UI update'],
];

// Subscribe with wallet money (server-verified, instant).
export default function SubscriptionScreen({ onBack, onOpenWallet }) {
  const { profile, walletBalance: balance } = useAppData(); // null = still loading
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const active = isSubscriptionActive(profile);
  const low = balance !== null && balance < SUBSCRIPTION_PRICE_ETB;

  async function subscribe() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // The profile is live (shared data layer), so the new status appears by itself.
      await spendWallet({ type: 'subscription' });
    } catch (err) {
      setError(err.insufficient ? `Not enough balance — you need ${SUBSCRIPTION_PRICE_ETB} ETB.` : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenShell title="My Subscription" onBack={onBack}>
      <View style={ui.card}>
        <Text style={ui.cardLabel}>{active ? 'Premium plan' : 'Free plan'}</Text>
        <Text style={[ui.cardValue, { fontSize: 22 }]}>{active ? "You're subscribed" : 'Not subscribed yet'}</Text>
        <Text style={ui.cardSub}>
          {active
            ? (profile?.subscriptionExpiresAt ? `Valid until ${formatExpiry(profile.subscriptionExpiresAt)}` : 'Active')
            : `${SUBSCRIPTION_PRICE_ETB} ETB / ${SUBSCRIPTION_PERIOD_DAYS} days`}
        </Text>
      </View>

      <Text style={ui.sectionTitle}>What's included</Text>
      {PERKS.map(([t, d]) => (
        <View key={t} style={{ marginBottom: 10 }}>
          <Text style={ui.txLabel}>{t}</Text>
          <Text style={ui.txDate}>{d}</Text>
        </View>
      ))}

      {!active && profile ? (
        <View style={{ marginTop: 12 }}>
          <Text style={ui.muted}>Wallet balance: {balance === null ? '···' : `${balance.toLocaleString('en-US')} ETB`}</Text>
          {error ? <Text style={ui.error}>{error}</Text> : null}
          {low ? (
            <Pressable style={[ui.primary, { marginTop: 10 }]} onPress={onOpenWallet} accessibilityRole="button">
              <Text style={ui.primaryText}>Top up wallet</Text>
            </Pressable>
          ) : (
            <Pressable style={[ui.primary, { marginTop: 10 }, busy && ui.disabled]} onPress={subscribe} disabled={busy} accessibilityRole="button">
              <Text style={ui.primaryText}>{busy ? 'Subscribing…' : `Subscribe — ${SUBSCRIPTION_PRICE_ETB} ETB`}</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </ScreenShell>
  );
}
