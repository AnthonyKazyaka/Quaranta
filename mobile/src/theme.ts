import { useWindowDimensions } from 'react-native';

/** Card-table palette. The app has a single dark "felt" theme. */
export const colors = {
  felt: '#0f3d24',
  feltLight: '#16502f',
  feltDark: '#0a2b19',
  surface: '#1d5c38',
  border: '#2f7a4f',
  gold: '#f2c14e',
  goldDark: '#c99a2e',
  text: '#f5f3e8',
  textMuted: '#b9cdbf',
  danger: '#ff8a7a',
  cardFace: '#fffdf7',
  cardBorder: '#d8d2c0',
  cardRed: '#c62828',
  cardBlack: '#1b1b1b',
  cardBack: '#7b1e2b',
  cardBackAccent: '#a83245',
  selected: '#f2c14e',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 6, md: 10, lg: 16 } as const;

/**
 * Layout sizing following the Lawnscapers breakpoints:
 * width >= 900 large tablet / desktop, width >= 600 tablet, otherwise phone.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isLarge = width >= 900;
  const isTablet = width >= 600;
  const contentWidth = Math.min(width, 1100);
  // Fit 7 hand cards per row on phones, more on bigger screens.
  const perRow = isLarge ? 14 : isTablet ? 10 : 7;
  const handCardWidth = Math.max(40, Math.min(76, Math.floor((contentWidth - spacing.lg * 2) / perRow) - spacing.xs));
  const tableCardWidth = Math.round(handCardWidth * 0.62);
  return { width, height, isLarge, isTablet, contentWidth, handCardWidth, tableCardWidth };
}
