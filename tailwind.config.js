/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    screens: {
      'sm': '375px',
      'md': '414px',
      'lg': '768px',
      'xl': '1024px',
      '2xl': '1440px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
        system: {
          bg: '#F3F4F6',
          surface: '#FFFFFF',
          surfaceSolid: '#FFFFFF',
          muted: '#E5E7EB',
          border: '#D1D5DB',
        },
        primary: {
          DEFAULT: '#004587',
          hover: '#003870',
          light: '#E6F0FF',
          gradientStart: '#004587',
          gradientEnd: '#003870',
        },
        glass: {
          card: '#FFFFFF',
          border: '#E5E7EB',
          highlight: '#F9FAFB',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          text: '#065F46',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          text: '#991B1B',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          text: '#92400E',
        },
        text: {
          primary: '#111827',
          secondary: '#4B5563',
          tertiary: '#6B7280',
        }
      },
      fontSize: {
        'large-title': ['34px', { lineHeight: '40px', letterSpacing: '-0.03em', fontWeight: '800' }],
        'title-1': ['28px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'title-2': ['22px', { lineHeight: '28px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline': ['17px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'subhead': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'glass': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'glass-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glass-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'glass-inset': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      },
      backdropBlur: {
        'glass': '0px',
        'glass-heavy': '0px',
      }
    },
  },
  plugins: [],
}
