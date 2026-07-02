/*
File description:
This file configures ESLint for the Next.js application. It extends the official Next.js rules so common
React, accessibility, and App Router mistakes are caught during development.
*/

import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [...nextVitals, ...nextTs];

export default eslintConfig;
