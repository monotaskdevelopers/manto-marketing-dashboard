/*
File description:
This file wires Tailwind CSS into PostCSS for the Next.js application. Tailwind v4 uses the
@tailwindcss/postcss plugin so global styles can import Tailwind directly from CSS.
*/

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
