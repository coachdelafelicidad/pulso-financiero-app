import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          deep: '#06403C',
          DEFAULT: '#0B5E58',
          light: '#0D736C',
        },
        mint: '#9AD9CF',
        green: '#7DC242',
        cream: '#F7F5F0',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        inter: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        poppins: ['var(--font-poppins)', 'Poppins', 'system-ui', 'sans-serif'],
        display: ['var(--font-poppins)', 'Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
