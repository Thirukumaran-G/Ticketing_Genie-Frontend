/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // Original sizes bumped ~25-30% — readable but not oversized
        xs:    ['0.85rem',  { lineHeight: '1.35' }],
        sm:    ['1rem',     { lineHeight: '1.5'  }],
        base:  ['1.125rem', { lineHeight: '1.6'  }],
        lg:    ['1.25rem',  { lineHeight: '1.6'  }],
        xl:    ['1.5rem',   { lineHeight: '1.5'  }],
        '2xl': ['1.875rem', { lineHeight: '1.3'  }],
        '3xl': ['2.25rem',  { lineHeight: '1.2'  }],
        '4xl': ['2.75rem',  { lineHeight: '1.1'  }],
        '5xl': ['3.5rem',   { lineHeight: '1'    }],
      },
    },
  },
  plugins: [],
};
