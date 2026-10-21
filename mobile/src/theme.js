// Mirrors frontend/src/styles/theme.css (light mode) so the native
// app matches the bot's web UI instead of inventing its own look.
// Keep these values in sync with theme.css by hand — there's no
// shared source between the two apps.

export const colors = {
  bgApp: '#FFFFFF',
  surface: '#F4F5F7',
  surfaceSunken: '#F5F5F7',
  cardSurface: '#F5F5F7',

  ink: '#1F1F1F',
  inkSoft: '#5F6368',
  inkFaint: '#6E737A',
  line: '#E0E0E0',

  primary: '#1E4B3F',
  primaryDark: '#12332A',
  primaryTint: '#E4EEE9',

  // Telegram-ish blue used for the search bar / active chip (tg = "Telegram" in theme.css).
  tgSearch: '#F2F3F8',
  tgBar: '#EBEEF8',
  tgActive: '#D9E1FB',
  tgActiveInk: '#2F4FC4',
  tgAccent: '#3F63E0',

  accent: '#E5A03B',
  accentDark: '#B9791F',
  accentTint: '#FBEDD4',

  safety: '#C1502E',
  safetyTint: '#FBE7E0',
  ok: '#2F7A4D',
  okTint: '#E1F1E5',

  muted: '#8C6A3F',
  mutedTint: '#F1E9E1',

  white: '#FFFFFF',
};

export const radius = {
  lg: 16,
  md: 14,
  sm: 10,
  pill: 100,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
};

export const shadow = {
  card: {
    shadowColor: '#132228',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
};

export const font = {
  family: 'Inter_400Regular',
  familyMedium: 'Inter_500Medium',
  familySemiBold: 'Inter_600SemiBold',
  familyBold: 'Inter_700Bold',
  familyExtraBold: 'Inter_800ExtraBold',
};
