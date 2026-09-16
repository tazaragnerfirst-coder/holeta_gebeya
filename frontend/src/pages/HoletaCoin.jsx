import React, { useEffect, useState } from 'react';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import {
  subscribeCoinRateHistory, subscribeCoinTransactions,
  buyCoin, sellCoin, transferCoin, resolveCoinAddress,
} from '../lib/coin';
import { COIN_BASE_RATE_ETB, MIN_COIN_BUY_ETB, MIN_COIN_SELL_AMOUNT } from '../lib/constants';
import { showAlert, showConfirm, hapticSuccess, hapticError } from '../lib/telegram';
import Icon from '../components/Icon.jsx';
import CoinRateChart from '../components/CoinRateChart.jsx';

const TX_LABEL = {
  buy: 'Bought Coin', sell: 'Sold Coin', transfer_in: 'Received', transfer_out: 'Sent',
  spend: 'Spent', earn_referral: 'Referral reward',
};
const TX_ICON = {
  buy: 'arrowUp', sell: 'arrowDown', transfer_in: 'arrowDown', transfer_out: 'send',
  spend: 'crown', earn_referral: 'share',
};

function formatTxDate(ts) {
  const ms = ts?.toMillis ? ts.toMillis() : null;
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatCoin(n) {
  return (Math.round((n || 0) * 100) / 100).toLocaleString('en-US');
}

export default function HoletaCoin() {
  const requireRegistered = useRequireRegistered();
  const { registeredUid, profile, coinBalance, coinBalanceReady, coinMarket, coinMarketReady } = useAppData();

  const [rateHistory, setRateHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [copied, setCopied] = useState(false);

  const [side, setSide] = useState('buy'); // 'buy' | 'sell'
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeBusy, setTradeBusy] = useState(false);
  const [tradeError, setTradeError] = useState('');

  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendPreview, setSendPreview] = useState(null); // { firstName } | null
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    if (!registeredUid) { requireRegistered().catch(() => {}); return; }
    const unsubHistory = subscribeCoinRateHistory(setRateHistory);
    const unsubTx = subscribeCoinTransactions(registeredUid, setTransactions);
    return () => { unsubHistory(); unsubTx(); };
  }, [registeredUid]);

  // Debounced recipient-name preview as the sender types an address.
  useEffect(() => {
    const address = sendAddress.trim();
    if (address.length < 6) { setSendPreview(null); return; }
    const t = setTimeout(() => {
      resolveCoinAddress(address).then(setSendPreview);
    }, 400);
    return () => clearTimeout(t);
  }, [sendAddress]);

  const rate = coinMarket?.rate || COIN_BASE_RATE_ETB;
  const firstRate = rateHistory[0]?.rate;
  const rateUp = firstRate != null ? rate >= firstRate : true;

  const tradeAmountNum = Number(tradeAmount);
  const buyValid = side === 'buy' && tradeAmount !== '' && tradeAmountNum >= MIN_COIN_BUY_ETB;
  const sellValid = side === 'sell' && tradeAmount !== '' && tradeAmountNum >= MIN_COIN_SELL_AMOUNT && tradeAmountNum <= coinBalance;
  const tradeValid = side === 'buy' ? buyValid : sellValid;
  const estimatedOut = side === 'buy'
    ? (tradeAmountNum > 0 ? tradeAmountNum / rate : 0)
    : (tradeAmountNum > 0 ? tradeAmountNum * rate : 0);

  async function handleTrade() {
    if (!tradeValid || tradeBusy) return;
    setTradeBusy(true);
    setTradeError('');
    try {
      if (side === 'buy') await buyCoin(tradeAmountNum);
      else await sellCoin(tradeAmountNum);
      hapticSuccess();
      setTradeAmount('');
    } catch (err) {
      hapticError();
      setTradeError(err.insufficient ? "Not enough balance for that." : (err.message || 'Something went wrong.'));
    } finally {
      setTradeBusy(false);
    }
  }

  const sendAmountNum = Number(sendAmount);
  const sendValid = sendAddress.trim().length >= 6 && sendAmount !== '' && sendAmountNum > 0 && sendAmountNum <= coinBalance;

  async function handleSend() {
    if (!sendValid || sendBusy) return;
    const label = sendPreview?.firstName ? `${sendPreview.firstName} (${sendAddress.trim()})` : sendAddress.trim();
    const ok = await showConfirm(`Send ${formatCoin(sendAmountNum)} Coin to ${label}?`);
    if (!ok) return;
    setSendBusy(true);
    setSendError('');
    try {
      await transferCoin(sendAddress.trim(), sendAmountNum);
      hapticSuccess();
      setSendAddress('');
      setSendAmount('');
      setSendPreview(null);
      await showAlert('Sent.');
    } catch (err) {
      hapticError();
      setSendError(err.insufficient ? "Not enough balance for that." : (err.message || 'Something went wrong.'));
    } finally {
      setSendBusy(false);
    }
  }

  function copyAddress() {
    if (!profile?.coinAddress) return;
    navigator.clipboard?.writeText(profile.coinAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="page">
      <h2 className="page-title">Holeta Coin</h2>

      <div className="wallet-hero">
        <div className="wallet-hero-label"><Icon name="coin" size={13} /> Balance</div>
        <div className="wallet-hero-amount">
          {coinBalanceReady ? `${formatCoin(coinBalance)} Coin` : '···'}
        </div>
        <p className="wallet-hero-note">
          ≈ {coinMarketReady ? `${(coinBalance * rate).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB` : '···'}
        </p>
      </div>

      <div className={`coin-rate-pill ${rateUp ? 'up' : 'down'}`}>
        <Icon name={rateUp ? 'arrowUp' : 'arrowDown'} size={12} />
        1 Coin = {rate.toFixed(2)} ETB
      </div>

      <div className="chart-card" style={{ marginTop: 10 }}>
        <CoinRateChart points={rateHistory} />
      </div>

      <div className="coin-buysell-toggle">
        <button type="button" className={`coin-buysell-btn buy ${side === 'buy' ? 'active' : ''}`} onClick={() => { setSide('buy'); setTradeAmount(''); setTradeError(''); }}>
          Buy
        </button>
        <button type="button" className={`coin-buysell-btn sell ${side === 'sell' ? 'active' : ''}`} onClick={() => { setSide('sell'); setTradeAmount(''); setTradeError(''); }}>
          Sell
        </button>
      </div>

      <div className="wallet-topup-card">
        <input
          type="number"
          className="wallet-amount-input"
          placeholder={side === 'buy' ? `Amount in ETB (min ${MIN_COIN_BUY_ETB})` : `Amount in Coin (min ${MIN_COIN_SELL_AMOUNT})`}
          value={tradeAmount}
          onChange={(e) => setTradeAmount(e.target.value)}
        />
        {tradeAmountNum > 0 && (
          <p className="helper-text" style={{ marginTop: 6 }}>
            You receive: <strong>{formatCoin(estimatedOut)} {side === 'buy' ? 'Coin' : 'ETB'}</strong>
          </p>
        )}
        {tradeError && <p className="helper-text error-text">{tradeError}</p>}
        <button
          type="button"
          className="wallet-topup-cta"
          style={{ marginTop: 10, width: '100%', justifyContent: 'center', background: side === 'sell' ? 'var(--safety)' : undefined }}
          onClick={handleTrade}
          disabled={!tradeValid || tradeBusy}
        >
          {tradeBusy ? <span className="spinner" /> : <Icon name={side === 'buy' ? 'arrowUp' : 'arrowDown'} size={13} />}
          {side === 'buy' ? 'Buy Coin' : 'Sell Coin'}
        </button>
      </div>

      <div className="section-title" style={{ marginTop: 18 }}><Icon name="swap" size={16} /> Send Coin</div>
      <div className="wallet-topup-card">
        <input
          type="text"
          className="wallet-amount-input"
          placeholder="Recipient Coin address (HGC-XXXXXXXX)"
          value={sendAddress}
          onChange={(e) => { setSendAddress(e.target.value); setSendError(''); }}
        />
        {sendPreview && <p className="helper-text" style={{ marginTop: 4 }}>Sending to <strong>{sendPreview.firstName}</strong></p>}
        <input
          type="number"
          className="wallet-amount-input"
          style={{ marginTop: 8 }}
          placeholder="Amount in Coin"
          value={sendAmount}
          onChange={(e) => setSendAmount(e.target.value)}
        />
        {sendError && <p className="helper-text error-text">{sendError}</p>}
        <button
          type="button"
          className="wallet-topup-cta"
          style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
          onClick={handleSend}
          disabled={!sendValid || sendBusy}
        >
          {sendBusy ? <span className="spinner" /> : <Icon name="send" size={13} />} Send
        </button>
      </div>

      <div className="section-title" style={{ marginTop: 18 }}><Icon name="wallet" size={16} /> Your Coin address</div>
      <div className="wallet-topup-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, flex: 1 }}>
            {profile?.coinAddress || '···'}
          </span>
          <button type="button" className="btn-outline-primary" style={{ padding: '6px 10px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700 }} onClick={copyAddress}>
            <Icon name={copied ? 'check' : 'copy'} size={13} /> {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="helper-text" style={{ marginTop: 8 }}>
          Share this address for others to send you Coin, or share it as your invite link's referral code to earn Coin when they join.
        </p>
      </div>

      <div className="section-title" style={{ marginTop: 18 }}><Icon name="history" size={16} /> Recent activity</div>
      {transactions.length === 0 ? (
        <p className="helper-text">No Coin activity yet.</p>
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
                {tx.amount >= 0 ? '+' : ''}{formatCoin(tx.amount)} Coin
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
