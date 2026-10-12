import {
  Code,
  Terminal,
  Zap,
  Database,
  Shield,
  Activity,
  Sparkles,
  Cpu,
  Layers,
  Layout,
  LucideIcon,
} from 'lucide-react';
import { AppDesignConfig } from '../types/builder';

export interface AccentThemeDef {
  id: AppDesignConfig['accentColor'];
  label: string;
  hex: string;
  primaryBg: string;
  hoverBg: string;
  primaryText: string;
  softBg: string;
  softBorder: string;
  softText: string;
  ringClass: string;
}

export const ACCENT_PALETTES: AccentThemeDef[] = [
  {
    id: 'sky',
    label: 'Sky Blue',
    hex: '#38BDF8',
    primaryBg: 'bg-sky-400 text-slate-950',
    hoverBg: 'hover:bg-sky-300',
    primaryText: 'text-sky-400',
    softBg: 'bg-sky-500/10',
    softBorder: 'border-sky-500/30',
    softText: 'text-sky-300',
    ringClass: 'ring-sky-400',
  },
  {
    id: 'emerald',
    label: 'Emerald Green',
    hex: '#34D399',
    primaryBg: 'bg-emerald-400 text-slate-950',
    hoverBg: 'hover:bg-emerald-300',
    primaryText: 'text-emerald-400',
    softBg: 'bg-emerald-500/10',
    softBorder: 'border-emerald-500/30',
    softText: 'text-emerald-300',
    ringClass: 'ring-emerald-400',
  },
  {
    id: 'cyan',
    label: 'Cyber Cyan',
    hex: '#22D3EE',
    primaryBg: 'bg-cyan-400 text-slate-950',
    hoverBg: 'hover:bg-cyan-300',
    primaryText: 'text-cyan-400',
    softBg: 'bg-cyan-500/10',
    softBorder: 'border-cyan-500/30',
    softText: 'text-cyan-300',
    ringClass: 'ring-cyan-400',
  },
  {
    id: 'indigo',
    label: 'Royal Indigo',
    hex: '#818CF8',
    primaryBg: 'bg-indigo-400 text-slate-950',
    hoverBg: 'hover:bg-indigo-300',
    primaryText: 'text-indigo-400',
    softBg: 'bg-indigo-500/10',
    softBorder: 'border-indigo-500/30',
    softText: 'text-indigo-300',
    ringClass: 'ring-indigo-400',
  },
  {
    id: 'violet',
    label: 'Neon Violet',
    hex: '#A78BFA',
    primaryBg: 'bg-violet-400 text-slate-950',
    hoverBg: 'hover:bg-violet-300',
    primaryText: 'text-violet-400',
    softBg: 'bg-violet-500/10',
    softBorder: 'border-violet-500/30',
    softText: 'text-violet-300',
    ringClass: 'ring-violet-400',
  },
  {
    id: 'amber',
    label: 'Amber Gold',
    hex: '#FBBF24',
    primaryBg: 'bg-amber-400 text-slate-950',
    hoverBg: 'hover:bg-amber-300',
    primaryText: 'text-amber-400',
    softBg: 'bg-amber-500/10',
    softBorder: 'border-amber-500/30',
    softText: 'text-amber-300',
    ringClass: 'ring-amber-400',
  },
  {
    id: 'rose',
    label: 'Rose Crimson',
    hex: '#FB7185',
    primaryBg: 'bg-rose-400 text-slate-950',
    hoverBg: 'hover:bg-rose-300',
    primaryText: 'text-rose-400',
    softBg: 'bg-rose-500/10',
    softBorder: 'border-rose-500/30',
    softText: 'text-rose-300',
    ringClass: 'ring-rose-400',
  },
  {
    id: 'teal',
    label: 'Mint Teal',
    hex: '#2DD4BF',
    primaryBg: 'bg-teal-400 text-slate-950',
    hoverBg: 'hover:bg-teal-300',
    primaryText: 'text-teal-400',
    softBg: 'bg-teal-500/10',
    softBorder: 'border-teal-500/30',
    softText: 'text-teal-300',
    ringClass: 'ring-teal-400',
  },
];

export interface SurfaceThemeDef {
  id: AppDesignConfig['surfaceTheme'];
  label: string;
  desc: string;
  hexBg: string;
  canvasClass: string;
  cardBaseClass: string;
  borderClass: string;
}

export const SURFACE_THEMES: SurfaceThemeDef[] = [
  {
    id: 'midnight',
    label: 'Midnight Slate',
    desc: '#0B0F19 deep slate navy',
    hexBg: '#0B0F19',
    canvasClass: 'bg-[#0B0F19]',
    cardBaseClass: 'bg-[#0F172A]',
    borderClass: 'border-slate-800',
  },
  {
    id: 'obsidian',
    label: 'Deep Obsidian',
    desc: '#030712 pitch black tone',
    hexBg: '#030712',
    canvasClass: 'bg-[#030712]',
    cardBaseClass: 'bg-[#0B0F17]',
    borderClass: 'border-slate-800/80',
  },
  {
    id: 'charcoal',
    label: 'Cyber Charcoal',
    desc: '#111827 refined graphite',
    hexBg: '#111827',
    canvasClass: 'bg-[#111827]',
    cardBaseClass: 'bg-[#1F2937]',
    borderClass: 'border-gray-800',
  },
  {
    id: 'slate',
    label: 'Steel Slate',
    desc: '#1E293B high contrast industrial',
    hexBg: '#1E293B',
    canvasClass: 'bg-[#1E293B]',
    cardBaseClass: 'bg-[#0F172A]',
    borderClass: 'border-slate-700',
  },
  {
    id: 'pure_dark',
    label: 'OLED Pure Dark',
    desc: '#000000 absolute zero OLED',
    hexBg: '#000000',
    canvasClass: 'bg-black',
    cardBaseClass: 'bg-[#0A0A0A]',
    borderClass: 'border-neutral-850 border-neutral-800',
  },
];

export const APP_ICONS: Array<{
  id: AppDesignConfig['appIcon'];
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'code', label: 'Code', icon: Code },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'bolt', label: 'Bolt', icon: Zap },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'shield', label: 'Shield', icon: Shield },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { id: 'cpu', label: 'Processor', icon: Cpu },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'layout', label: 'Layout', icon: Layout },
];

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  config: AppDesignConfig;
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: 'executive',
    name: 'Executive Modern',
    description: 'Sky Blue accent with frosted glassmorphic cards and crisp sans typography.',
    config: {
      accentColor: 'sky',
      surfaceTheme: 'midnight',
      cardRadius: 'modern',
      cardSurface: 'glass',
      fontFamily: 'sans',
      layoutDensity: 'standard',
      appIcon: 'layers',
      bannerVisible: true,
      gridColumns: 3,
      showLiveClock: true,
      enableStatusPill: true,
    },
  },
  {
    id: 'fintech',
    name: 'Fintech Emerald',
    description: 'Emerald green with obsidian surfaces and solid high-legibility cards.',
    config: {
      accentColor: 'emerald',
      surfaceTheme: 'obsidian',
      cardRadius: 'modern',
      cardSurface: 'solid',
      fontFamily: 'mono',
      layoutDensity: 'standard',
      appIcon: 'database',
      bannerVisible: true,
      gridColumns: 3,
      showLiveClock: true,
      enableStatusPill: true,
    },
  },
  {
    id: 'cyber',
    name: 'Cyber Command',
    description: 'High-contrast cyan with sharp industrial edges and bordered outline cards.',
    config: {
      accentColor: 'cyan',
      surfaceTheme: 'charcoal',
      cardRadius: 'sharp',
      cardSurface: 'bordered',
      fontFamily: 'mono',
      layoutDensity: 'compact',
      appIcon: 'terminal',
      bannerVisible: true,
      gridColumns: 2,
      showLiveClock: true,
      enableStatusPill: true,
    },
  },
  {
    id: 'industrial',
    name: 'Industrial Amber',
    description: 'High-visibility amber alert tone with steel slate canvas and sharp geometry.',
    config: {
      accentColor: 'amber',
      surfaceTheme: 'slate',
      cardRadius: 'sharp',
      cardSurface: 'solid',
      fontFamily: 'sans',
      layoutDensity: 'compact',
      appIcon: 'activity',
      bannerVisible: false,
      gridColumns: 3,
      showLiveClock: false,
      enableStatusPill: true,
    },
  },
  {
    id: 'quantum',
    name: 'Quantum Violet',
    description: 'OLED pure dark background with neon violet accents and fluid rounded cards.',
    config: {
      accentColor: 'violet',
      surfaceTheme: 'pure_dark',
      cardRadius: 'pill',
      cardSurface: 'glass',
      fontFamily: 'sans',
      layoutDensity: 'spacious',
      appIcon: 'cpu',
      bannerVisible: true,
      gridColumns: 3,
      showLiveClock: true,
      enableStatusPill: true,
    },
  },
  {
    id: 'creative',
    name: 'Creative Studio',
    description: 'Vibrant crimson rose highlights with subtle gradient mesh backgrounds.',
    config: {
      accentColor: 'rose',
      surfaceTheme: 'midnight',
      cardRadius: 'rounded',
      cardSurface: 'mesh',
      fontFamily: 'sans',
      layoutDensity: 'spacious',
      appIcon: 'sparkles',
      bannerVisible: true,
      gridColumns: 3,
      showLiveClock: true,
      enableStatusPill: true,
    },
  },
];

export function getResolvedTheme(design?: AppDesignConfig) {
  const d: AppDesignConfig = {
    accentColor: design?.accentColor || 'sky',
    surfaceTheme: design?.surfaceTheme || 'midnight',
    cardRadius: design?.cardRadius || 'modern',
    cardSurface: design?.cardSurface || 'solid',
    fontFamily: design?.fontFamily || 'sans',
    layoutDensity: design?.layoutDensity || 'standard',
    appIcon: design?.appIcon || 'code',
    bannerVisible: design?.bannerVisible ?? true,
    gridColumns: design?.gridColumns || 3,
    showLiveClock: design?.showLiveClock ?? true,
    enableStatusPill: design?.enableStatusPill ?? true,
    appTitleCustom: design?.appTitleCustom,
    appSubtitleCustom: design?.appSubtitleCustom,
  };

  const accent = ACCENT_PALETTES.find((a) => a.id === d.accentColor) || ACCENT_PALETTES[0];
  const surface = SURFACE_THEMES.find((s) => s.id === d.surfaceTheme) || SURFACE_THEMES[0];
  const iconDef = APP_ICONS.find((i) => i.id === d.appIcon) || APP_ICONS[0];

  let radiusClass = 'rounded-xl';
  let innerRadiusClass = 'rounded-lg';
  let badgeRadiusClass = 'rounded';
  if (d.cardRadius === 'sharp') {
    radiusClass = 'rounded-none';
    innerRadiusClass = 'rounded-none';
    badgeRadiusClass = 'rounded-none';
  } else if (d.cardRadius === 'rounded') {
    radiusClass = 'rounded-2xl';
    innerRadiusClass = 'rounded-xl';
    badgeRadiusClass = 'rounded-md';
  } else if (d.cardRadius === 'pill') {
    radiusClass = 'rounded-3xl';
    innerRadiusClass = 'rounded-2xl';
    badgeRadiusClass = 'rounded-full';
  }

  let materialClass = `${surface.cardBaseClass} border ${surface.borderClass}`;
  if (d.cardSurface === 'glass') {
    materialClass = 'bg-slate-900/60 backdrop-blur-md border border-slate-700/60 shadow-xl';
  } else if (d.cardSurface === 'mesh') {
    materialClass = 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-xl';
  } else if (d.cardSurface === 'bordered') {
    materialClass = 'bg-[#0B0F17] border-2 border-slate-700/80 shadow-md';
  }

  let densityPadding = 'p-6';
  let densityGap = 'gap-4';
  if (d.layoutDensity === 'compact') {
    densityPadding = 'p-4';
    densityGap = 'gap-3';
  } else if (d.layoutDensity === 'spacious') {
    densityPadding = 'p-8';
    densityGap = 'gap-6';
  }

  let gridClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  if (d.gridColumns === 1) {
    gridClass = 'grid-cols-1 max-w-2xl mx-auto';
  } else if (d.gridColumns === 2) {
    gridClass = 'grid-cols-1 sm:grid-cols-2';
  }

  return {
    config: d,
    accent,
    surface,
    IconComponent: iconDef.icon,
    radiusClass,
    innerRadiusClass,
    badgeRadiusClass,
    materialClass,
    densityPadding,
    densityGap,
    gridClass,
    fontClass: d.fontFamily === 'mono' ? 'font-mono' : 'font-sans',
  };
}
