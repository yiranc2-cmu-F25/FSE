/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/**/*.{html,js,ejs}", "./views/**/*.ejs", "./public/**/*.js"],
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
