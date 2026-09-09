import React, { useEffect, useState } from 'react';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import { submitWalletTopup, getPendingWalletTopup, subscribeWalletTransactions } from '../lib/wallet';
import { MIN_WALLET_TOPUP_ETB, PAYMENT_ACCOUNTS } from '../lib/constants';
import Icon from '../components/Icon.jsx';
import ChipSelect from '../components/ChipSelect.jsx';
import ImageUploader from '../components/ImageUploader.jsx';

// Manual receipt-review top-up (same model as equb_bot / the old
// subscriptionPayments flow): user sends money to one of
// PAYMENT_ACCOUNTS, uploads a screenshot here, an admin approves it
// from the admin panel's Wallet Topups tab, which credits the
// balance below. Subscription and Boost then spend straight from
// that balance — see lib/wallet.js's spendWallet().
const TX_LABEL = { topup: 'Top-up', subscription: 'Subscription', boost: 'Boost' };
const TX_ICON = { topup: 'arrowUp', subscription: 'crown', boost: 'trendingUp' };

function formatTxDate(ts) {
  const ms = ts?.toMillis ? ts.toMillis() : null;
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Wallet() {
  const requireRegistered = useRequireRegistered();
  const { registeredUid, profile, walletBalance, walletBalanceReady } = useAppData();
  const [pending, setPending] = useState(undefined); // undefined = loading, null = none
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [receiptImages, setReceiptImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!registeredUid) { requireRegistered().catch(() => {}); return; }
    getPendingWalletTopup(registeredUid).then(setPending).catch(() => setPending(null));
    const unsub = subscribeWalletTransactions(registeredUid, setTransactions);
    return unsub;
  }, [registeredUid]);

  const amountNum = Number(amount);
  const amountValid = amount !== '' && amountNum >= MIN_WALLET_TOPUP_ETB;

  async function handleSubmit() {
    if (!amountValid || !paymentMethod || receiptImages.length === 0 || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await submitWalletTopup(registeredUid, {
        name: profile?.name,
        phone: profile?.phone,
        amount: amountNum,
        paymentMethod,
        receiptImage: receiptImages[0],
      });
      setPending({ paymentMethod, amount: amountNum, status: 'pending' });
      setShowForm(false);
    } catch {
      setError("Couldn't submit your top-up — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">Wallet</h2>

      <div className="wallet-hero">
        <div className="wallet-hero-label"><Icon name="wallet" size={13} /> Balance</div>
        <div className="wallet-hero-amount">
          {walletBalanceReady ? `${walletBalance.toLocaleString('en-US')} ETB` : '···'}
        </div>
        <p className="wallet-hero-note">Funds Subscription and Boost purchases — no separate payment needed for either.</p>
      </div>

      {pending && (
        <div className="coming-soon-note">
          <Icon name="clock" size={13} /> Your top-up of {pending.amount} ETB is under review — this usually doesn't take long.
        </div>
      )}

      {pending === null && !showForm && (
        <button
          type="button"
          className="wallet-topup-cta"
          onClick={() => setShowForm(true)}
        >
          <Icon name="plus" size={14} /> Top up
        </button>
      )}

      {pending === null && showForm && (
        <div className="wallet-topup-card">
          <div className="top"><Icon name="coin" size={14} /> Top up wallet</div>
          <p className="helper-text" style={{ marginTop: 2 }}>
            Send at least {MIN_WALLET_TOPUP_ETB} ETB to one of the accounts below, then upload a screenshot of the receipt.
          </p>

          <input
            type="number"
            className="wallet-amount-input"
            placeholder={`Amount (min ${MIN_WALLET_TOPUP_ETB} ETB)`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={MIN_WALLET_TOPUP_ETB}
          />

          <div style={{ marginTop: 10 }}>
            <ChipSelect
              options={PAYMENT_ACCOUNTS.map((a) => ({ label: a.label, value: a.method }))}
              value={paymentMethod}
              onChange={setPaymentMethod}
              placeholder="Select payment method"
            />
          </div>

          {paymentMethod && (
            <div className="coming-soon-note" style={{ marginTop: 8 }}>
              Send to: <strong>{PAYMENT_ACCOUNTS.find((a) => a.method === paymentMethod)?.account}</strong> ({paymentMethod})
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <ImageUploader files={receiptImages} onChange={setReceiptImages} maxImages={1} compact />
          </div>

          {error && <p className="helper-text error-text">{error}</p>}

          <button
            type="button"
            className="wallet-topup-cta"
            style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
            onClick={handleSubmit}
            disabled={!amountValid || !paymentMethod || receiptImages.length === 0 || submitting}
          >
            {submitting ? <span className="spinner" /> : <Icon name="send" size={13} />} Submit for review
          </button>
        </div>
      )}

      <div className="section-title"><Icon name="history" size={16} /> Recent activity</div>
      {transactions.length === 0 ? (
        <p className="helper-text">No wallet activity yet.</p>
      ) : (
        <div className="wallet-history">
          {transactions.map((tx) => (
            <div className="wallet-tx-row" key={tx.id}>
              <div className="wallet-tx-icon"><Icon name={TX_ICON[tx.type] || 'coin'} size={15} /></div>
              <div className="wallet-tx-info">
                <div className="t">{TX_LABEL[tx.type] || tx.type}</div>
                <div className="d">{formatTxDate(tx.createdAt)}</div>
              </div>
              <div className={`wallet-tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                {tx.amount >= 0 ? '+' : ''}{tx.amount} ETB
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
