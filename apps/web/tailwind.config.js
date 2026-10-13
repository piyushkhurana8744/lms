/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['variant', [
    '&:where(.dark, .dark *)',
    '&:where([data-theme="dark"], [data-theme="dark"] *)'
  ]],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'var(--font-sans)', 'sans-serif'],
      },
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        brand: {
          DEFAULT: 'var(--brand-primary)',
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
          background: 'var(--brand-background)',
          text: 'var(--brand-text)',
          accent: 'var(--brand-accent)',
          border: 'var(--brand-border)',
          surface: 'var(--bg-surface)',
          surfaceElevated: 'var(--bg-surface-elevated)',
          mutedText: 'var(--text-muted)',
          faintText: 'var(--text-faint)',
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#BE1E2E',
          600: '#be1e2e',
          700: '#9f1827',
          800: '#881337',
          900: '#68101a'
        }
      },
      backgroundColor: {
        surface: 'var(--bg-surface)',
        'surface-elevated': 'var(--bg-surface-elevated)',
        'input': 'var(--input-bg)',
        'modal': 'var(--modal-bg)',
        'table-header': 'var(--table-header-bg)',
        'badge': 'var(--badge-bg)',
      },
      borderColor: {
        'input': 'var(--input-border)',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'glow-sm': '0 0 15px -3px rgba(190, 30, 46, 0.25)',
        'glow-md': '0 0 25px -4px rgba(190, 30, 46, 0.35)',
        'glow-lg': '0 0 40px -6px rgba(190, 30, 46, 0.45)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.12)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      }
    }
  },
  plugins: []
};
