import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        // Nest 2.0 Typography Scale
        'display': ['36px', { lineHeight: '1.1', fontWeight: '700' }],
        'h1': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'h2': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'h3': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'body': ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-medium': ['15px', { lineHeight: '22px', fontWeight: '500' }],
        'secondary': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'small': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'label': ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'caption': ['11px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '0.05em' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          light: "hsl(var(--brand-primary-light))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Nest 2.0 Brand Colors
        brand: {
          primary: "hsl(var(--brand-primary))",
          "primary-light": "hsl(var(--brand-primary-light))",
          "primary-hover": "hsl(var(--brand-primary-hover))",
        },
        // Nest 2.0 Text Colors
        text: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          tertiary: "hsl(var(--text-tertiary))",
        },
        // Nest 2.0 Surface Colors
        surface: {
          DEFAULT: "hsl(var(--surface-default))",
          subtle: "hsl(var(--surface-subtle))",
        },
        // Nest 2.0 Status Colors
        success: {
          DEFAULT: "hsl(var(--success))",
          light: "hsl(var(--success-light))",
        },
        pending: {
          DEFAULT: "hsl(var(--pending))",
          light: "hsl(var(--pending-light))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          light: "hsl(var(--warning-light))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          light: "hsl(var(--error-light))",
        },
        // Chart colors
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        // Selected state
        "selected-border": "hsl(var(--selected-border))",
        "selected-bg": "hsl(var(--selected-background))",
      },
      spacing: {
        // Nest 2.0 Spacing Scale
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '18': '72px',
        '20': '80px',
      },
      borderWidth: {
        // Nest 2.0 Border Width Hierarchy
        'thin': '1px',
        'standard': '1.5px',
        'emphasis': '2px',
      },
      boxShadow: {
        // Nest 2.0 Shadow System
        'none': 'none',
        'sm': '0 1px 2px rgba(0,0,0,0.04)',
        'card': '0 1px 4px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.08)',
        'hover': '0 4px 12px rgba(0,0,0,0.08)',
        'toast': '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)',
        'toast-dark': '0 4px 24px rgba(0,0,0,0.3)',
        'dropdown': '0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)',
        'modal': '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        'focus': '0 0 0 3px hsl(var(--ring) / 0.15)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Nest 2.0 Border Radius Hierarchy
        'control': "6px",           // Badges, tags, mini controls
        'button': "8px",            // Outline/secondary/danger buttons, inputs
        'button-primary': "16px",   // Primary buttons (filled teal CTAs)
        'input': "8px",             // Input fields
        'dropdown': "12px",         // Menus, popovers, dropdown lists
        'card': "16px",             // Cards, modals, panels (DEFAULT)
        'card-sm': "12px",          // Small info boxes (override)
        'modal': "16px",            // Modal dialogs
        'pill': "9999px",           // Fully rounded pills
      },
      transitionDuration: {
        // Nest 2.0 Animation Timing
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        // Nest 2.0 Easing Functions
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
        'spring': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "fade-in-fast": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-from-top": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-from-bottom": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "step-forward": {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "step-back": {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        "collapsible-up": "collapsible-up 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-in": "fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-out": "fade-out 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-in-fast": "fade-in-fast 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-from-top": "slide-in-from-top 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-from-bottom": "slide-in-from-bottom 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "step-forward": "step-forward 250ms ease-out",
        "step-back": "step-back 250ms ease-out",
        "scale-in": "scale-in 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        "pulse-soft": "pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
