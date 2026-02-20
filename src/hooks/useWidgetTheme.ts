import { createContext, useContext } from 'react';

export type WidgetTheme = 'soft' | 'glass';

export interface WidgetThemeTokens {
  theme: WidgetTheme;
  // Background
  bgClass: string;
  bgStyle?: React.CSSProperties;
  // CTA buttons
  ctaRadius: string;
  ctaShadow: (color: string) => string;
  ctaHoverClass: string;
  // Inputs
  inputClass: string;
  inputFocusRing: (color: string) => string;
  // Time slots
  slotLayout: 'grid' | 'scroll';
  slotRadius: string;
  slotSelectedStyle: (color: string) => React.CSSProperties;
  slotDefaultStyle: (isSqueeze: boolean, accentColor: string) => React.CSSProperties;
  // Cards / containers
  cardClass: string;
  // Progress
  progressStyle: 'dots' | 'bar';
  // Party size
  partySizeContainerClass: string;
  partySizeButtonClass: string;
  // Select pills
  selectPillRadius: string;
  // Back button
  backButtonClass: string;
  // Calendar day radius
  calendarDayRadius: string;
  // Welcome/error banners
  bannerRadius: string;
}

const softTokens: WidgetThemeTokens = {
  theme: 'soft',
  bgClass: 'bg-[#FAFAF8]',
  ctaRadius: 'rounded-2xl',
  ctaShadow: (color) => `0 4px 14px -3px ${color}66`,
  ctaHoverClass: 'hover:brightness-105 hover:scale-[1.02] active:scale-[0.98]',
  inputClass: 'rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white',
  inputFocusRing: (color) => `0 0 0 3px ${color}15`,
  slotLayout: 'grid',
  slotRadius: 'rounded-xl',
  slotSelectedStyle: (color) => ({
    backgroundColor: color,
    color: '#fff',
    boxShadow: `0 4px 14px -3px ${color}50`,
    transform: 'scale(1.05)',
    border: 'none',
  }),
  slotDefaultStyle: () => ({
    backgroundColor: '#fff',
    color: '#374151',
    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
    border: 'none',
  }),
  cardClass: 'bg-white shadow-sm rounded-2xl p-4',
  progressStyle: 'dots',
  partySizeContainerClass: '',
  partySizeButtonClass: 'w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-all disabled:opacity-30',
  selectPillRadius: 'rounded-xl',
  backButtonClass: 'flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 self-start rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors',
  calendarDayRadius: '8px',
  bannerRadius: 'rounded-xl',
};

const glassTokens: WidgetThemeTokens = {
  theme: 'glass',
  bgClass: '',
  bgStyle: {
    background: 'radial-gradient(ellipse at 20% 50%, rgba(200,220,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(180,240,230,0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(220,200,255,0.1) 0%, transparent 50%), #FAFAF8',
  },
  ctaRadius: 'rounded-full',
  ctaShadow: (color) => `0 6px 20px -4px ${color}40`,
  ctaHoverClass: 'hover:scale-[1.02] active:scale-[0.98]',
  inputClass: 'border-b-2 border-gray-200 bg-transparent px-1 py-3 text-sm focus:border-current',
  inputFocusRing: () => 'none',
  slotLayout: 'scroll',
  slotRadius: 'rounded-full',
  slotSelectedStyle: (color) => ({
    backgroundColor: `${color}18`,
    color: color,
    backdropFilter: 'blur(8px)',
    border: `1.5px solid ${color}40`,
    fontWeight: 600,
    transform: 'scale(1.05)',
  }),
  slotDefaultStyle: () => ({
    backgroundColor: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(4px)',
    color: '#374151',
    border: '1px solid rgba(255,255,255,0.5)',
  }),
  cardClass: 'backdrop-blur-md bg-white/70 border border-white/30 rounded-3xl p-4',
  progressStyle: 'bar',
  partySizeContainerClass: 'bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/40',
  partySizeButtonClass: 'w-12 h-12 rounded-full bg-white/70 backdrop-blur-sm border border-white/40 flex items-center justify-center hover:bg-white/90 transition-all disabled:opacity-30',
  selectPillRadius: 'rounded-full',
  backButtonClass: 'flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 self-start rounded-full px-3 py-1 hover:bg-white/60 backdrop-blur-sm transition-colors',
  calendarDayRadius: '50%',
  bannerRadius: 'rounded-2xl',
};

export function getWidgetThemeTokens(theme: WidgetTheme): WidgetThemeTokens {
  return theme === 'glass' ? glassTokens : softTokens;
}

// Context for components to consume
export const WidgetThemeContext = createContext<WidgetThemeTokens>(softTokens);

export function useWidgetTheme(): WidgetThemeTokens {
  return useContext(WidgetThemeContext);
}
