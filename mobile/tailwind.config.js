/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // High-Fidelity Brand Palette
        primary: {
          DEFAULT: '#006d3b',          // Core Brand Dark Mint
          container: '#74e39b',        // Vibrant Highlight Mint
          onContainer: '#006436',      // Dark contrast Text
          fixed: '#8af9af',
        },
        secondary: {
          DEFAULT: '#526070',          // Brand Slate
          container: '#d5e4f8',        // Cool slate gray accents
          onContainer: '#586676',      // Readable supporting text
        },
        surface: {
          DEFAULT: '#f7f9fb',          // Air-cool backdrop light mode
          dim: '#d8dadc',              // Dark Mode background foundation
          containerLowest: '#ffffff',  // Cards background
          containerHigh: '#e6e8ea',    // Input fields backdrop background
        },
        text: {
          onSurface: '#191c1e',        // Dominant primary headers
          onSurfaceVariant: '#3e4a40', // Supportive descriptive texts
        },
        error: {
          DEFAULT: '#ba1a1a',          // Alerts, overdue statuses
          container: '#ffdad6',        // Alert backdrops
          onContainer: '#93000a',      // Alert emphasis typography
        }
      },
      fontFamily: {
        // Standardizing Typography arrays across Native Platforms
        sans: ['Hanken Grotesk', 'System', 'sans-serif'],
      }
    },
  },
  plugins: [],
};