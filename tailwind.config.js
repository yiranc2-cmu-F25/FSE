/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js,ejs}",
    "./views/**/*.ejs",
    "./public/**/*.js",
    "./public/js/**/*.js",
  ],
  safelist: [
    {
      pattern: /bg-(red|yellow|green|gray)-200/,
    },
    {
      pattern: /text-(red|yellow|green|gray)-500/,
    },
  ],
  theme: {
    extend: {
      colors: {
        theme: "#d65841",
        "brand-primary": "#d65841",
        "brand-secondary": "#f7e8e2",
        primary: '#D8553E', // 截图中的橙红色按钮
        softRed: '#FEE2E2',
        softBlue: '#E0F2FE',
        softGray: '#F3F4F6',
        activeGreen: '#DCFCE7',
        inactiveGray: '#E5E7EB'
      },
      fontFamily: {
        poppins: ["Poppins", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};
