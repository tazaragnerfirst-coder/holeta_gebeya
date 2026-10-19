import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import ScreenShell, { ui } from '../components/ScreenShell';
import { auth } from '../lib/firebase';
import { isLiveAd, subscribeMyAds } from '../lib/ads';
import { spendWallet, subscribeWalletBalance } from '../lib/wallet';
import { BOOST_DURATION_DAYS, BOOST_PRICE_ETB } from '../lib/constants';

function boostedUntilText(ad) {
  const ms = ad.boostedUntil?.toMillis?.();
  if (!ms || ms <= Date.now()) return null;
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Pick one of your live ads and boost it with wallet money.
export default function BoostScreen({ onBack, onOpenWallet }) {
  const uid = auth.currentUser?.uid;
  const [ads, setAds] = useState(null);
  const [balance, setBalance] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    const a = subscribeMyAds(uid, setAds, () => setAds([]));
    const b = subscribeWalletBalance(uid, setBalance);
    return () => { a(); b(); };
  }, [uid]);

  function confirmBoost(ad) {
    Alert.alert(
      'Boost this ad?',
      `${BOOST_PRICE_ETB} ETB for ${BOOST_DURATION_DAYS} days, taken from your wallet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Boost',
          onPress: async () => {
            setBusyId(ad.id);
            try {
              await spendWallet({ type: 'boost', listingId: ad.id });
            } catch (err) {
              if (err.insufficient) {
                Alert.alert('Not enough balance', `You need ${BOOST_PRICE_ETB} ETB.`, [
                  { text: 'Close', style: 'cancel' },
                  { text: 'Wallet', onPress: onOpenWallet },
                ]);
              } else {
                Alert.alert("Couldn't boost", err.message || 'Try again.');
              }
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  }

  const live = (ads || []).filter(isLiveAd);

  return (
    <ScreenShell title="Boost my ads" onBack={onBack}>
      <View style={ui.card}>
        <Text style={ui.cardLabel}>Get seen first</Text>
        <Text style={[ui.cardValue, { fontSize: 20 }]}>{BOOST_PRICE_ETB} ETB / {BOOST_DURATION_DAYS} days</Text>
        <Text style={ui.cardSub}>
          Boosted ads appear first in search and category listings. Wallet: {balance === null ? '···' : `${balance.toLocaleString('en-US')} ETB`}
        </Text>
      </View>

      <Text style={ui.sectionTitle}>Your active ads</Text>
      {ads === null ? <Text style={ui.muted}>Loading…</Text> : live.length === 0 ? (
        <Text style={ui.muted}>You have no active ads to boost.</Text>
      ) : live.map((ad) => {
        const until = boostedUntilText(ad);
        return (
          <View key={ad.id} style={ui.txRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={ui.txLabel} numberOfLines={2}>{ad.title || 'Untitled'}</Text>
              <Text style={ui.txDate}>{until ? `Boosted until ${until}` : `👁 ${ad.views || 0}`}</Text>
            </View>
            <Pressable
              style={[ui.secondary, { paddingHorizontal: 16, paddingVertical: 8 }, busyId === ad.id && ui.disabled]}
              disabled={busyId === ad.id}
              onPress={() => confirmBoost(ad)}
              accessibilityRole="button"
            >
              <Text style={ui.secondaryText}>{until ? 'Extend' : 'Boost'}</Text>
            </Pressable>
          </View>
        );
      })}
    </ScreenShell>
  );
}
