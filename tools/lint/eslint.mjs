import javascript from '@eslint/js';
import globals from 'globals';

export default [
  javascript.configs.recommended,
  {
    files: ['dist/js/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        gsap: 'readonly',
        ScrollTrigger: 'readonly',
      },
    },
  },
  {
    files: ['tools/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
