import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import ScreenShell, { ui } from '../components/ScreenShell';
import { auth } from '../lib/firebase';
import { getPendingWalletTopup, subscribeWalletBalance, subscribeWalletTransactions } from '../lib/wallet';
import { MIN_WALLET_TOPUP_ETB } from '../lib/constants';
import { formatTxDate } from '../lib/format';

const TX_LABEL = { topup: 'Top-up', subscription: 'Subscription', boost: 'Boost' };

// Balance, pending top-up notice and history. Adding money needs a receipt photo, which is done in the web app for now.
export default function WalletScreen({ onBack }) {
  const uid = auth.currentUser?.uid;
  const [balance, setBalance] = useState(null);
  const [txs, setTxs] = useState(null);
  const [pending, setPending] = useState(undefined);

  useEffect(() => {
    if (!uid) return undefined;
    getPendingWalletTopup(uid).then(setPending).catch(() => setPending(null));
    const a = subscribeWalletBalance(uid, setBalance);
    const b = subscribeWalletTransactions(uid, setTxs);
    return () => { a(); b(); };
  }, [uid]);

  return (
    <ScreenShell title="Wallet" onBack={onBack}>
      <View style={ui.card}>
        <Text style={ui.cardLabel}>Balance</Text>
        <Text style={ui.cardValue}>{balance === null ? '···' : `${balance.toLocaleString('en-US')} ETB`}</Text>
      </View>

      {pending ? (
        <Text style={ui.muted}>Your top-up of {pending.amount} ETB is under review — this usually doesn't take long.</Text>
      ) : (
        <Text style={ui.muted}>
          To add money (minimum {MIN_WALLET_TOPUP_ETB} ETB), use Top up in the Holeta Gebeya web app. It needs a payment receipt photo, which isn't in this app yet.
        </Text>
      )}

      <Text style={ui.sectionTitle}>History</Text>
      {txs === null ? <Text style={ui.muted}>Loading…</Text> : txs.length === 0 ? (
        <Text style={ui.muted}>No transactions yet.</Text>
      ) : txs.map((tx) => (
        <View style={ui.txRow} key={tx.id}>
          <View>
            <Text style={ui.txLabel}>{TX_LABEL[tx.type] || tx.type}</Text>
            <Text style={ui.txDate}>{formatTxDate(tx.createdAt)}</Text>
          </View>
          <Text style={tx.amount >= 0 ? ui.pos : ui.neg}>{tx.amount >= 0 ? '+' : ''}{tx.amount} ETB</Text>
        </View>
      ))}
    </ScreenShell>
  );
}
