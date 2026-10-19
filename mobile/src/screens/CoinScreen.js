import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import ScreenShell, { ui } from '../components/ScreenShell';
import { auth } from '../lib/firebase';
import {
  buyCoin, formatCoin, resolveCoinAddress, sellCoin, subscribeCoinBalance,
  subscribeCoinMarket, subscribeCoinTransactions, transferCoin,
} from '../lib/coin';
import { COIN_BASE_RATE_ETB, MIN_COIN_BUY_ETB, MIN_COIN_SELL_AMOUNT } from '../lib/constants';
import { formatTxDate } from '../lib/format';

const TX_LABEL = {
  buy: 'Bought Coin', sell: 'Sold Coin', transfer_in: 'Received', transfer_out: 'Sent',
  spend: 'Spent', earn_referral: 'Referral reward',
};

// Holeta Coin: balance, buy/sell against the wallet, send to another address, history.
export default function CoinScreen({ onBack }) {
  const uid = auth.currentUser?.uid;
  const [balance, setBalance] = useState(null);
  const [market, setMarket] = useState(null);
  const [txs, setTxs] = useState(null);
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');
  const [tradeBusy, setTradeBusy] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [preview, setPreview] = useState(null);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    if (!uid) return undefined;
    const a = subscribeCoinBalance(uid, setBalance);
    const b = subscribeCoinMarket(setMarket);
    const c = subscribeCoinTransactions(uid, setTxs);
    return () => { a(); b(); c(); };
  }, [uid]);

  useEffect(() => {
    const address = sendAddress.trim();
    if (address.length < 6) { setPreview(null); return undefined; }
    const t = setTimeout(() => resolveCoinAddress(address).then(setPreview), 400);
    return () => clearTimeout(t);
  }, [sendAddress]);

  const rate = market?.rate || COIN_BASE_RATE_ETB;
  const num = parseFloat(amount);
  const estimate = num > 0 ? (side === 'buy' ? num / rate : num * rate) : 0;

  async function trade() {
    if (tradeBusy) return;
    if (!(num > 0)) { setTradeError('Enter an amount.'); return; }
    if (side === 'buy' && num < MIN_COIN_BUY_ETB) { setTradeError(`Minimum buy is ${MIN_COIN_BUY_ETB} ETB.`); return; }
    if (side === 'sell' && num < MIN_COIN_SELL_AMOUNT) { setTradeError(`Minimum sell is ${MIN_COIN_SELL_AMOUNT} Coin.`); return; }
    setTradeBusy(true);
    setTradeError('');
    try {
      if (side === 'buy') await buyCoin(num); else await sellCoin(num);
      setAmount('');
    } catch (err) {
      setTradeError(err.insufficient ? 'Not enough balance for that.' : err.message);
    } finally {
      setTradeBusy(false);
    }
  }

  function send() {
    const to = sendAddress.trim();
    const n = parseFloat(sendAmount);
    if (!to || !(n > 0) || sendBusy) { setSendError('Enter an address and an amount.'); return; }
    const label = preview?.firstName ? `${preview.firstName} (${to})` : to;
    Alert.alert('Send Coin', `Send ${formatCoin(n)} Coin to ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setSendBusy(true);
          setSendError('');
          try {
            await transferCoin(to, n);
            setSendAddress('');
            setSendAmount('');
            setPreview(null);
          } catch (err) {
            setSendError(err.insufficient ? 'Not enough balance for that.' : err.message);
          } finally {
            setSendBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <ScreenShell title="Holeta Coin" onBack={onBack}>
      <View style={ui.card}>
        <Text style={ui.cardLabel}>Your balance</Text>
        <Text style={ui.cardValue}>{balance === null ? '···' : `${formatCoin(balance)} Coin`}</Text>
        <Text style={ui.cardSub}>
          ≈ {balance === null ? '···' : `${Math.round(balance * rate).toLocaleString('en-US')} ETB`} · 1 Coin = {rate.toFixed(2)} ETB
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        {['buy', 'sell'].map((s) => (
          <Pressable
            key={s}
            onPress={() => { setSide(s); setTradeError(''); }}
            style={[side === s ? ui.primary : ui.secondary, { flex: 1, marginTop: 0 }]}
            accessibilityRole="button"
          >
            <Text style={side === s ? ui.primaryText : ui.secondaryText}>{s === 'buy' ? 'Buy' : 'Sell'}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={ui.input}
        value={amount}
        onChangeText={(v) => { setAmount(v); setTradeError(''); }}
        keyboardType="decimal-pad"
        placeholder={side === 'buy' ? 'Amount in ETB (from wallet)' : 'Amount in Coin'}
      />
      {num > 0 ? (
        <Text style={ui.muted}>
          ≈ {side === 'buy' ? `${formatCoin(estimate)} Coin` : `${estimate.toLocaleString('en-US', { maximumFractionDigits: 2 })} ETB`}
        </Text>
      ) : null}
      {tradeError ? <Text style={ui.error}>{tradeError}</Text> : null}
      <Pressable style={[ui.primary, tradeBusy && ui.disabled]} onPress={trade} disabled={tradeBusy} accessibilityRole="button">
        <Text style={ui.primaryText}>{tradeBusy ? 'Working…' : side === 'buy' ? 'Buy Coin' : 'Sell Coin'}</Text>
      </Pressable>

      <Text style={[ui.sectionTitle, { marginTop: 24 }]}>Send Coin</Text>
      <TextInput
        style={ui.input}
        value={sendAddress}
        onChangeText={(v) => { setSendAddress(v); setSendError(''); }}
        autoCapitalize="none"
        placeholder="Recipient address"
      />
      {preview?.firstName ? <Text style={ui.muted}>Sending to {preview.firstName}</Text> : null}
      <TextInput
        style={[ui.input, { marginTop: 8 }]}
        value={sendAmount}
        onChangeText={(v) => { setSendAmount(v); setSendError(''); }}
        keyboardType="decimal-pad"
        placeholder="Amount in Coin"
      />
      {sendError ? <Text style={ui.error}>{sendError}</Text> : null}
      <Pressable style={[ui.secondary, sendBusy && ui.disabled]} onPress={send} disabled={sendBusy} accessibilityRole="button">
        <Text style={ui.secondaryText}>{sendBusy ? 'Sending…' : 'Send'}</Text>
      </Pressable>

      <Text style={[ui.sectionTitle, { marginTop: 24 }]}>History</Text>
      {txs === null ? <Text style={ui.muted}>Loading…</Text> : txs.length === 0 ? (
        <Text style={ui.muted}>No transactions yet.</Text>
      ) : txs.map((tx) => (
        <View style={ui.txRow} key={tx.id}>
          <View>
            <Text style={ui.txLabel}>{TX_LABEL[tx.type] || tx.type}</Text>
            <Text style={ui.txDate}>{formatTxDate(tx.createdAt)}</Text>
          </View>
          <Text style={tx.amount >= 0 ? ui.pos : ui.neg}>{tx.amount >= 0 ? '+' : ''}{formatCoin(tx.amount)} Coin</Text>
        </View>
      ))}
    </ScreenShell>
  );
}
