import { useWindowDimensions } from 'react-native';

/** Card-room palette: deep green felt, brass accents, ivory cards. The app has a single dark theme. */
export const colors = {
  felt: '#0e3f25',
  feltLight: '#17573a',
  feltDark: '#0a2c1a',
  feltDeep: '#061a0f',
  /** Translucent panels laid over the felt. */
  panel: 'rgba(4, 22, 12, 0.42)',
  panelStrong: 'rgba(4, 22, 12, 0.7)',
  panelBorder: 'rgba(242, 214, 150, 0.12)',
  surface: '#1c5a3a',
  border: '#2f7a4f',
  gold: '#f2c14e',
  goldLight: '#ffe08a',
  goldDark: '#b8892a',
  goldSoft: 'rgba(242, 193, 78, 0.16)',
  text: '#f6f1e3',
  textMuted: '#a9c2b2',
  textFaint: '#76937f',
  danger: '#ff8a7a',
  dangerSoft: 'rgba(255, 138, 122, 0.14)',
  cardFace: '#fffaf0',
  cardFaceShade: '#f3ead6',
  cardBorder: '#ddd3bc',
  cardRed: '#b8261e',
  cardBlack: '#1d1d1f',
  cardBack: '#7a1d2c',
  cardBackDark: '#55121e',
  cardBackAccent: '#d4a95a',
  selected: '#f2c14e',
  backdrop: 'rgba(2, 12, 6, 0.72)',
} as const;

/** One accent per seat, so a player's chip and melds read as theirs. Seat 0 is the human. */
export const seatColors = ['#f2c14e', '#ef8a6b', '#8ec5e8', '#c9a7e3', '#9fd6a6', '#f0a6c0'] as const;

export function seatColor(index: number): string {
  return seatColors[index % seatColors.length];
}

/** Playfair Display, loaded in app/_layout.tsx. Falls back to the system font until it loads. */
export const fonts = {
  display: 'PlayfairDisplay_700Bold',
  displayHeavy: 'PlayfairDisplay_900Black',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16, xl: 22, pill: 999 } as const;

export const shadows = {
  card: '0px 2px 4px rgba(0, 0, 0, 0.28)',
  cardLifted: '0px 10px 18px rgba(0, 0, 0, 0.35), 0px 0px 0px 2px rgba(242, 193, 78, 0.95)',
  panel: '0px 8px 24px rgba(0, 0, 0, 0.25)',
  glow: '0px 0px 18px rgba(242, 193, 78, 0.55)',
} as const;

/**
 * Layout sizing following the Lawnscapers breakpoints:
 * width >= 900 large tablet / desktop, width >= 600 tablet, otherwise phone.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isLarge = width >= 900;
  const isTablet = width >= 600;
  const contentWidth = Math.min(width, 1180);
  // Fit 7 hand cards per row on phones, more on bigger screens.
  const perRow = isLarge ? 14 : isTablet ? 10 : 7;
  const handCardWidth = Math.max(40, Math.min(78, Math.floor((contentWidth - spacing.lg * 2) / perRow) - spacing.xs));
  // Short landscape screens need smaller cards so the hand and table both fit.
  const pileCardWidth = Math.round(handCardWidth * (height < 700 ? 0.9 : 1.05));
  const tableCardWidth = Math.round(handCardWidth * 0.62);
  return { width, height, isLarge, isTablet, contentWidth, handCardWidth, pileCardWidth, tableCardWidth };
}
