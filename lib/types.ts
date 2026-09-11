export interface SocialLinks {
  website?: string;
  github?: string;
  x?: string;
  linkedin?: string;
  discord?: string;
  steam?: string;
  youtube?: string;
}

export type ThemeShaderKey =
  | 'halftone'
  | 'halftone-ink'
  | 'sparkle'
  | 'sparkle-gold'
  | 'wave'
  | 'dither'
  | 'ascii'
  | 'holographic'
  | 'obsidian'
  | 'prism'
  | 'pixel'
  | 'grain'
  | 'loewe'
  | 'javazero'
  | 'banhua'
  | 'cyrsks'
  | 'orcdev'
  | 'clio'
  | 'splines'
  | (string & {});

export interface CardTheme {
  key: ThemeShaderKey;
  label: string;
  description: string;
  category: string;
  bgGradient: string;
  cardBg: string;
  textColor: string;
  accentColor: string;
  chipBg: string;
  borderColor: string;
  glowColor: string;
  swatchColors: [string, string];
  darkBgHex?: string;
  rarity?: string;
  rarityRate?: string;
  openshadersHandle?: string;
  isCustomOpenShader?: boolean;
}

export type MaterialFinish = 'holographic' | 'glass' | 'metallic' | 'matte';
export type CardFontFamily = 'sans' | 'mono' | 'serif' | 'cyber';
export type CardLayoutPreset = 'balanced' | 'minimal' | 'developer' | 'showcase';
export type LiveStatusType = 'available' | 'focus' | 'busy' | 'gaming' | 'none';
export type AvatarShape = 'circle' | 'squircle' | 'hexagon' | 'cyber';
export type AvatarType = 'monogram' | 'image' | 'pixel' | 'geometric';

export interface MaterialSettings {
  finish: MaterialFinish;
  shimmerIntensity: number; // 0 - 100
  glassBlur: number; // 0 - 24
  borderRadius: 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl' | 'rounded-none';
}

export interface TypographySettings {
  fontFamily: CardFontFamily;
  layoutPreset: CardLayoutPreset;
}

export interface LiveStatusSettings {
  status: LiveStatusType;
  customText?: string;
  showClock: boolean;
  cityLabel?: string;
}

export interface AvatarCustomization {
  type: AvatarType;
  shape: AvatarShape;
  glowRing: boolean;
  customImageUrl?: string;
}

export interface ShowcaseSettings {
  motto?: string;
  projectTitle?: string;
  projectDesc?: string;
  projectUrl?: string;
  email?: string;
}

export interface VisibilitySettings {
  username: boolean;
  location: boolean;
  year: boolean;
  bio: boolean;
  links: boolean;
  skills: boolean;
  badges: boolean;
  qr: boolean;
  showSkillsOnFront?: boolean;
  showLinksOnFront?: boolean;
  showStatusOnFront?: boolean;
  showClockOnFront?: boolean;
  showMottoOnBack?: boolean;
  showProjectOnBack?: boolean;
}

export interface CardProfile {
  name: string;
  username: string;
  role: string;
  location: string;
  year: string;
  bio: string;
  avatar: string;
  skills: string[];
  badges: string[];
  links: SocialLinks;
  themeKey: ThemeShaderKey;
  show: VisibilitySettings;
  material?: MaterialSettings;
  typography?: TypographySettings;
  status?: LiveStatusSettings;
  avatarConfig?: AvatarCustomization;
  showcase?: ShowcaseSettings;
}
