// Lets the bottom-nav fab — which lives outside PostAd's own
// component tree in App.jsx — trigger PostAd's submit() while the
// person is on /post, same action as tapping Continue/Save Changes,
// just from the nav bar. PostAd registers on mount and unregisters
// on unmount, so the fab can tell whether a form is actually open
// right now.
let submitFn = null;

export function registerPostAdSubmit(fn) {
  submitFn = fn;
}

export function unregisterPostAdSubmit() {
  submitFn = null;
}

export function triggerPostAdSubmit() {
  submitFn?.();
}

export function hasPostAdSubmit() {
  return submitFn != null;
}
