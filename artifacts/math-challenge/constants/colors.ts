/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#17223F',
    tint: '#4A5DE2',
    background: '#F3F6FF',
    foreground: '#17223F',
    card: '#FFFDF7',
    cardForeground: '#17223F',
    primary: '#4057D6',
    primaryForeground: '#FFFDF7',
    secondary: '#E7EBFF',
    secondaryForeground: '#273B9B',
    muted: '#E9EFF9',
    mutedForeground: '#5A6783',
    accent: '#FFC94A',
    accentForeground: '#3B2A00',
    success: '#087A67',
    successForeground: '#F3FFFA',
    destructive: '#D95F62',
    destructiveForeground: '#451C20',
    border: '#D5DDF0',
    input: '#D5DDF0',
    navy: '#17264B',
    navyMuted: '#7F91BA',
  },
  dark: {
    text: '#F7F8FF',
    tint: '#93A7FF',
    background: '#0F1933',
    foreground: '#F7F8FF',
    card: '#17264A',
    cardForeground: '#F7F8FF',
    primary: '#8FA5FF',
    primaryForeground: '#111A34',
    secondary: '#293967',
    secondaryForeground: '#DFE5FF',
    muted: '#202F53',
    mutedForeground: '#AAB7D5',
    accent: '#FFD05A',
    accentForeground: '#392800',
    success: '#55D7B4',
    successForeground: '#082A23',
    destructive: '#FF8B88',
    destructiveForeground: '#40181B',
    border: '#334467',
    input: '#334467',
    navy: '#09142F',
    navyMuted: '#9BAACB',
  },
  radius: 18,
};

export default colors;
