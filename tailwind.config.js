/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
        borderRadius: {
            '4xl': '2rem',
            '5xl': '2.5rem',
            '6xl': '3rem',
        },
        colors: {
            primary: '#2563EB',
        }
    },
  },
  plugins: [],
};
