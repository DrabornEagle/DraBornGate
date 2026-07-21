export const colors = {
  background: '#06101D',
  backgroundSoft: '#091827',
  surface: '#0D2033',
  surfaceRaised: '#12283E',
  surfaceMuted: '#173047',
  border: 'rgba(151, 205, 255, 0.20)',
  borderStrong: 'rgba(116, 222, 255, 0.44)',
  text: '#F8FCFF',
  textSoft: '#C0CFDB',
  textMuted: '#8BA0B2',
  cyan: '#37D8FF',
  cyanDeep: '#1689FF',
  blue: '#468CFF',
  purple: '#9A76FF',
  magenta: '#FF67CF',
  green: '#43E7A2',
  orange: '#FFB35C',
  yellow: '#FFD166',
  red: '#FF657D',
  white: '#FFFFFF',
  black: '#000000',
};

export const gradients = {
  primary: [colors.cyanDeep, colors.purple] as const,
  success: ['#1CCB8A', '#45E5B1'] as const,
  warning: ['#FF9657', '#FFD166'] as const,
  danger: ['#FF506F', '#FF8398'] as const,
  panel: ['rgba(22, 55, 82, 0.98)', 'rgba(10, 29, 47, 0.98)'] as const,
  panelColorful: [
    'rgba(24, 64, 94, 0.98)',
    'rgba(18, 43, 72, 0.98)',
    'rgba(24, 31, 63, 0.98)',
  ] as const,
  courier: ['#087BD8', '#6B5CFF', '#B65CFF'] as const,
  security: ['#117D69', '#19B887', '#32C7D4'] as const,
  management: ['#6F52D9', '#A15DE0', '#E05EA8'] as const,
  dark: ['#0A1B2C', '#06101D'] as const,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  xxl: 40,
};
