/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0F1E',
        navy: '#0F1B3D',
        panel: '#131C36',
        line: '#24304F',
        electric: '#3B82F6',
        violet: '#7C5CFF',
        mist: '#F4F6FB',
        ok: '#22C55E',
        warn: '#F59E0B',
        crit: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.5)' },
    },
  },
  plugins: [],
};
