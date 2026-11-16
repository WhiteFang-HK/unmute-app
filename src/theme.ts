// Colours and fonts from the UNMUTE design canvas.
export const C = {
  ink: '#0E0D0F',
  text: '#F4F1EC',
  surface: '#1A181B',
  line: '#262328',
  border: '#3A363C',
  muted: '#9A958E',
  soft: '#B9B3AB',
  softer: '#D8D3CC',
  ember: '#FF5B37',
  emberLight: '#FF7D5E',
  // one colour per pillar
  community: '#FFB547',
  friendship: '#7FE0B5',
  dating: '#FF8FB1',
  care: '#B7A4FF',
} as const;

export const F = {
  display: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'Manrope_500Medium',
  regular: 'Manrope_400Regular',
  semi: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
} as const;

export type Pillar = 'community' | 'friendship' | 'dating' | 'care';
