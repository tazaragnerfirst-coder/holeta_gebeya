// Spread this onto a <Link>'s `state` prop when linking to a
// /product/:id route, so it opens as a sheet stacked on top of the
// current screen instead of replacing it. See App.jsx for how
// backgroundLocation is consumed.
export function productLinkState(location) {
  return { backgroundLocation: location };
}
