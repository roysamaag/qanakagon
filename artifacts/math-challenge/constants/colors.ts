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
    text: '#101827',
    tint: '#3157E8',
    background: '#F5F7FB',
    foreground: '#101827',
    card: '#FFFFFF',
    cardForeground: '#101827',
    primary: '#3157E8',
    primaryForeground: '#FFFFFF',
    secondary: '#E9EDFF',
    secondaryForeground: '#203A9B',
    muted: '#EEF1F7',
    mutedForeground: '#697386',
    accent: '#FFD166',
    accentForeground: '#422B00',
    success: '#1CA66A',
    successForeground: '#FFFFFF',
    destructive: '#D94A5B',
    destructiveForeground: '#FFFFFF',
    border: '#DCE2EF',
    input: '#DCE2EF',
    navy: '#18264A',
    navyMuted: '#62729A',
  },
  dark: {
    text: '#F7F9FF',
    tint: '#8EA5FF',
    background: '#10182C',
    foreground: '#F7F9FF',
    card: '#182442',
    cardForeground: '#F7F9FF',
    primary: '#8EA5FF',
    primaryForeground: '#111A32',
    secondary: '#26365F',
    secondaryForeground: '#DCE4FF',
    muted: '#202E50',
    mutedForeground: '#A4B0CD',
    accent: '#FFD166',
    accentForeground: '#422B00',
    success: '#5AD69D',
    successForeground: '#0B2B1C',
    destructive: '#FF8290',
    destructiveForeground: '#351016',
    border: '#304168',
    input: '#304168',
    navy: '#0B1224',
    navyMuted: '#A4B0CD',
  },
  radius: 18,
};

export default colors;
