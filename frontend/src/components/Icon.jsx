import React from 'react';

// Same consistent outline icon set used in the original prototype —
// simple, monochrome, single stroke style. No emoji anywhere.
const PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  mapPin: '<path d="M12 21s7-6.1 7-11.5A7 7 0 105 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/>',
  grid: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
  chevronRight: '<path d="M9 18l6-6-6-6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  phone: '<path d="M6.6 10.8a15.6 15.6 0 006.6 6.6l2.2-2.2a1.4 1.4 0 011.4-.34c1.1.36 2.3.56 3.5.56a1.4 1.4 0 011.4 1.4V20a1.4 1.4 0 01-1.4 1.4C10.6 21.4 2.6 13.4 2.6 3.7A1.4 1.4 0 014 2.3h3.2a1.4 1.4 0 011.4 1.4c0 1.2.2 2.4.56 3.5a1.4 1.4 0 01-.35 1.44l-2.2 2.16z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 01-8.9 8.4 8.7 8.7 0 01-3.8-.9L3 20l1.1-4.5A8.4 8.4 0 1121 11.5z"/>',
  flag: '<path d="M5 3v18"/><path d="M5 4.5c2.5-1.4 5-1.4 7.5 0s5 1.4 7.5 0v9c-2.5 1.4-5 1.4-7.5 0s-5-1.4-7.5 0"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 015.5 7H8l1-2h6l1 2h2.5A1.5 1.5 0 0120 8.5v9A1.5 1.5 0 0118.5 19h-13A1.5 1.5 0 014 17.5z"/><circle cx="12" cy="13" r="3.4"/>',
  trendingUp: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 6h6v6"/>',
  shield: '<path d="M12 3l7 3v6c0 4.7-3 7.7-7 9-4-1.3-7-4.3-7-9V6z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-10-9.3C.4 8 2 4.5 5.5 3.9c2-.3 3.9.6 5 2.3a5.6 5.6 0 015-2.3c3.5.6 5.1 4.1 3.5 7.3-2.5 4.7-10 9.3-10 9.3z"/>',
  helpCircle: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.8 2.8 0 015.4 1c0 1.8-2.6 2-2.6 3.7"/><circle cx="12" cy="17.3" r=".4" fill="currentColor" stroke="none"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1.6-4 4.6-6 8-6s6.4 2 8 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  home: '<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9.5h12V10"/>',
  briefcase: '<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M8 7.5v-2A2 2 0 0110 3.5h4a2 2 0 012 2v2"/><path d="M3 12.5h18"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.6 2.6L16 9.4"/>',
  cpu: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10" y="10" width="4" height="4"/><path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2"/>',
  shirt: '<path d="M8 4l4 2 4-2 4 3-2.5 3-1.5-1v10H8V9L6.5 10 4 7z"/>',
  car: '<path d="M4 16V12l2-5h12l2 5v4"/><path d="M4 16h16"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 16.5l5-4.5 3.5 3 3-2.5 4.5 4"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h13M21 18h0"/><circle cx="16" cy="6" r="2.2"/><circle cx="8" cy="12" r="2.2"/><circle cx="17" cy="18" r="2.2"/>',
  xCircle: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>',
  history: '<path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-7 3"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/>',
  frown: '<circle cx="12" cy="12" r="9"/><path d="M8.5 15.5c1-1.2 2.2-1.8 3.5-1.8s2.5.6 3.5 1.8"/><circle cx="9" cy="9.5" r=".5" fill="currentColor" stroke="none"/><circle cx="15" cy="9.5" r=".5" fill="currentColor" stroke="none"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  alertTriangle: '<path d="M12 3.5L2.3 20.5h19.4z"/><path d="M12 9.5v5"/><circle cx="12" cy="17.3" r=".4" fill="currentColor" stroke="none"/>',
  edit: '<path d="M4 20h4l10.5-10.5a2 2 0 000-3L17.5 5.5a2 2 0 00-3 0L4 16v4z"/><path d="M14 7.5l3 3"/>',
  logOut: '<path d="M9 21H5.5A1.5 1.5 0 014 19.5v-15A1.5 1.5 0 015.5 3H9"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
};

export default function Icon({ name, size = 20, className = '', style, ...rest }) {
  const path = PATHS[name] || '';
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: path }}
      {...rest}
    />
  );
}
