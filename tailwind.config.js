/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          900: '#14532d',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted:   '#f1f5f9',
          subtle:  '#e2e8f0',
        },
        border: {
          DEFAULT: '#e2e8f0',
          strong:  '#cbd5e1',
        },
        content: {
          primary:   '#0f172a',
          secondary: '#475569',
          muted:     '#94a3b8',
          inverse:   '#ffffff',
        },
        status: {
          success:        '#16a34a',
          'success-bg':   '#f0fdf4',
          warning:        '#d97706',
          'warning-bg':   '#fffbeb',
          danger:         '#dc2626',
          'danger-bg':    '#fef2f2',
          info:           '#2563eb',
          'info-bg':      '#eff6ff',
          neutral:        '#64748b',
          'neutral-bg':   '#f8fafc',
        },
      },
      borderRadius: {
        card:  '12px',
        input: '8px',
        badge: '6px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        'dropdown': '0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
