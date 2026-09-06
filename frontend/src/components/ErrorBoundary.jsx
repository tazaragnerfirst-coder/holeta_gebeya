import React from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, notifyAdmin } from '../lib/firebase';
import Icon from './Icon.jsx';

// Wrap this around one route/screen at a time (see App.jsx — it's
// keyed by pathname so navigating away/back always remounts a fresh
// instance). A render error inside stays contained to that one
// screen: the bottom nav, back button, and everything else outside
// this boundary keep working, instead of the whole app going blank.

// Per-error-signature throttle so the same recurring bug (e.g. a
// broken category everyone who taps it hits) doesn't spam the admin
// on every single occurrence — only the first time a given error is
// seen on this device within the window gets a Telegram ping. The
// Firestore log itself is never throttled, so nothing is lost from
// the record — this only limits the alert.
const ALERT_THROTTLE_MS = 60 * 60 * 1000; // 1 hour
function shouldAlert(signature) {
  try {
    const key = `hg_err_alert_${signature}`;
    const last = Number(window.localStorage.getItem(key) || 0);
    if (Date.now() - last < ALERT_THROTTLE_MS) return false;
    window.localStorage.setItem(key, String(Date.now()));
    return true;
  } catch {
    return true; // if localStorage is unavailable, err toward alerting
  }
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const message = error?.message || String(error);
    const signature = `${this.props.label || 'app'}:${message}`.slice(0, 200);

    // Best-effort — an error log write should never itself throw or
    // block the fallback UI from showing.
    addDoc(collection(db, 'errorLogs'), {
      message,
      stack: (error?.stack || '').slice(0, 2000),
      componentStack: (info?.componentStack || '').slice(0, 2000),
      page: this.props.label || window.location.hash || window.location.pathname,
      uid: auth.currentUser?.uid || null,
      createdAt: serverTimestamp(),
    }).catch((err) => console.error('errorLog write failed:', err));

    if (shouldAlert(signature)) {
      notifyAdmin({ text: `⚠️ App error on "${this.props.label || 'unknown page'}"\n${message}` });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="alertTriangle" size={26} /></div>
          <div className="empty-state-title">Something went wrong</div>
          <div className="empty-state-sub">This part of the app hit a problem. The rest of the app still works — try going back, or reload.</div>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: 16 }}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
