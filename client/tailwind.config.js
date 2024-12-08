/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}", "./node_modules/tailwind-datepicker-react/dist/**/*.js"],
  theme: {
    extend: {},
  },
  plugins: [],
  extend: {
    screens: {
      print: { raw: 'print' },
      screen: { raw: 'screen' },
    },
  },
}