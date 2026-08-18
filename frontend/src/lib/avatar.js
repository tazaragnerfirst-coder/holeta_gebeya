// Shared avatar helpers for chat UI. A small, muted palette that
// stays consistent with the app's earthy theme (rather than random
// bright hex colors) — the same name always resolves to the same
// color so a person is visually recognizable across chats.
const AVATAR_PALETTE = ['#1E4B3F', '#8B5E34', '#4E6E8E', '#A65C5C', '#6B7E3E', '#7A5C99', '#3E8E86'];

export function getInitial(name) {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
}

export function getAvatarColor(name) {
  const str = name || '?';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
