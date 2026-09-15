// Product links used to attach backgroundLocation state so /product/:id
// opened as a sheet over the current screen. Product pages are now a
// plain standalone route (see App.jsx), so this is a no-op kept only so
// existing <Link state={productLinkState(location)}> call sites don't
// need to change.
export function productLinkState(location) {
  return undefined;
}
