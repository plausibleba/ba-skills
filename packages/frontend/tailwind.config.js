/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vcc: {
          50:  '#F8FAFC',
          100: '#E2E8F0',
          200: '#CBD5E1',
          300: '#94A3B8',
          400: '#64748B',
          500: '#475467',
          600: '#334155',
          700: '#1E293B',
          800: '#1C212B',
          900: '#11141A',
          950: '#0A0C10',
        },
        status: {
          binding:      '#7C2D2D',
          bindingDeep:  '#6B1F1F',
          bindingLight: '#FEF2F2',
          accent:       '#0369A1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'vcc-sm':   '0 1px 2px 0 rgba(0,0,0,0.05)',
        'vcc-card': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        'vcc-glass':'inset 0 1px 0 0 rgba(255,255,255,0.05)',
      },
      animation: {
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};
