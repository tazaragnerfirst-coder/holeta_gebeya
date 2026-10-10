import React from 'react';

// Native (APK) only. If the app crashes before or outside its normal
// error boundaries, this shows the actual error text on screen instead
// of a blank page, so it can be read and reported. Not used on the web
// or in Telegram.
export default class NativeErrorScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <pre style={{ whiteSpace: 'pre-wrap', padding: 16, fontSize: 12, color: '#B00020', background: '#FFFFFF' }}>
        {`App error:\n${error?.message || String(error)}\n\n${(error?.stack || '').slice(0, 1500)}`}
      </pre>
    );
  }
}

// Errors that happen outside React rendering (async code, module loading).
export function installNativeErrorOverlay() {
  const show = (msg) => {
    const pre = document.createElement('pre');
    pre.style.cssText = 'white-space:pre-wrap;position:fixed;left:0;right:0;bottom:0;max-height:50vh;overflow:auto;padding:12px;margin:0;font-size:12px;color:#B00020;background:#FFFFFF;z-index:99999;';
    pre.textContent = `App error:\n${msg}`;
    document.body.appendChild(pre);
  };
  window.addEventListener('error', (e) => show(e.error?.stack || e.message || String(e)));
  window.addEventListener('unhandledrejection', (e) => show(e.reason?.stack || e.reason?.message || String(e.reason)));
}
