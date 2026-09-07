// Lets PostAd — which lives outside App.jsx's TelegramBackButton
// component tree — intercept the phone/Telegram back action while
// the person is on /post. Needed because the type-selection screen
// and the form it leads to (#hog013) are the same route/history
// entry (postType is just React state, not a route change), so the
// default `navigate(-1)` skips straight past both and lands on
// whatever came before /post (usually Home). PostAd registers a
// handler that returns true when it has handled the back itself
// (e.g. stepping from the form back to type-selection) and false to
// let the default history-back behavior run as normal.
let backFn = null;

export function registerPostAdBack(fn) {
  backFn = fn;
}

export function unregisterPostAdBack() {
  backFn = null;
}

// Returns true if PostAd handled the back itself (caller should stop
// there), false if the default navigate(-1)/navigate('/') should run.
export function triggerPostAdBack() {
  return backFn ? backFn() : false;
}

export function hasPostAdBack() {
  return backFn != null;
}
