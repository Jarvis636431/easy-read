/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./options.tsx", "./options/**/*.{ts,tsx}"],
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        ink: "#183039",
        mist: "#e9eeee",
        teal: "#176b78",
        paper: "#f8faf8"
      },
      fontFamily: {
        reading: ['"Songti SC"', "Georgia", "serif"],
        utility: ["Inter", '"SF Pro Text"', '"PingFang SC"', "sans-serif"]
      }
    }
  },
  plugins: []
}
