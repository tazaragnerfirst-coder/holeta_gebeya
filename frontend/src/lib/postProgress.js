import { useEffect, useState } from 'react';

// Plain module-level store (not a React Context) on purpose — a
// background retry kicked off from PostAd should keep running (and
// the top ring should keep showing) even if the person navigates
// away from PostAd entirely, so it can't live inside that page's
// component state.
let state = { active: false, failed: false };
const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

export function usePostProgress() {
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.add(setS);
    return () => listeners.delete(setS);
  }, []);
  return s;
}

// Network/cold-start-looking failures are worth retrying; real
// rule/validation rejections (cooldown, suspended, bad payload) are
// not — retrying those just wastes time and delays telling the
// person what's actually wrong.
export function isTransientError(err) {
  return /fetch|network|failed to fetch|unavailable/i.test(err?.message || '') || err?.code === 'unavailable';
}

// Shows the top ring for at least `minMs`, even when the call
// underneath finishes almost instantly — an instant, no-ceremony
// post reads as a cheap/unpolished app; a brief visible "working"
// moment (even for genuinely fast work) reads as a real service
// doing real checks. Unlike runInBackground, this never retries —
// a real failure still surfaces to the caller right away, just not
// before the minimum duration has elapsed.
export async function withMinDuration(fn, minMs = 900) {
  setState({ active: true, failed: false });
  const start = Date.now();
  const wait = async () => {
    const remaining = minMs - (Date.now() - start);
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
  };
  try {
    const result = await fn();
    await wait();
    setState({ active: false, failed: false });
    return result;
  } catch (err) {
    await wait();
    setState({ active: false, failed: false });
    throw err;
  }
}

// Spread over ~35s — enough to cover a Render free-tier cold start
// (up to ~30s) without hammering it.
const RETRY_DELAYS_MS = [5000, 10000, 20000];

// Retries `attempt` a few times in the background while the small
// top-of-app ring (see PostProgressRing.jsx) shows on every page.
// Not awaited by callers that want fire-and-forget behavior — the
// person is free to leave the page that started it. Stops the
// moment an error stops looking transient. Calls onFail once if
// every attempt is exhausted.
export async function runInBackground(attempt, { onFail } = {}) {
  setState({ active: true, failed: false });
  let lastErr;
  for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
    try {
      const result = await attempt();
      setState({ active: false, failed: false });
      return result;
    } catch (err) {
      lastErr = err;
      if (!isTransientError(err) || i === RETRY_DELAYS_MS.length) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
    }
  }
  setState({ active: false, failed: true });
  setTimeout(() => setState({ failed: false }), 4000);
  onFail?.(lastErr);
}
