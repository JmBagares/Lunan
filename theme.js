// Centralized design tokens for a warm, polished travel-diary aesthetic.

export const lightColors = {
  accent: '#FF6F61', // warm coral
  accentDark: '#E2503F',
  accentSoft: '#FFEDE9', // tinted coral for chips / backgrounds
  background: '#FFF9F5', // warm off-white
  card: '#FFFFFF',
  text: '#2B2622',
  subtext: '#8C817A',
  muted: '#B8ADA6',
  border: '#F0E6DF',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  star: '#F5A623',
  locationDot: '#2E7DF6',
  white: '#FFFFFF',
  overlay: 'rgba(43, 38, 34, 0.45)',
};

export const darkColors = {
  accent: '#FF7E6F',
  accentDark: '#FF9A8C',
  accentSoft: '#3A2723', // dark tinted coral
  background: '#181513', // warm near-black
  card: '#23201D',
  text: '#F4EEEA',
  subtext: '#B3A79F',
  muted: '#7E726A',
  border: '#332D29',
  danger: '#FF6B6B',
  dangerSoft: '#3A2422',
  star: '#F5A623',
  locationDot: '#5AA0FF',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

// Default palette (light). Used by surfaces that don't subscribe to the theme
// context, e.g. the static Leaflet map HTML.
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
};

// Typography carries text colors, so it's derived from the active palette.
export function makeTypography(c) {
  return {
    title: { fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: 0.2 },
    heading: { fontSize: 20, fontWeight: '700', color: c.text },
    cardTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    body: { fontSize: 15, fontWeight: '400', color: c.text, lineHeight: 22 },
    label: { fontSize: 13, fontWeight: '600', color: c.subtext, letterSpacing: 0.3 },
    meta: { fontSize: 12, fontWeight: '500', color: c.muted },
  };
}

export const typography = makeTypography(lightColors);

export const shadow = {
  // Soft, subtle elevation that works on both iOS and Android.
  card: {
    shadowColor: '#7A5C4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  floating: {
    shadowColor: '#C24B3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};
