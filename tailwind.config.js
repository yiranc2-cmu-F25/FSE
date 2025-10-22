/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/**/*.{html,js,ejs}", "./views/**/*.ejs", "./public/**/*.js", "./public/js/**/*.js",],
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
                theme: '#d65841',
            },
            fontFamily: {
                poppins: ['Poppins', 'Helvetica', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
