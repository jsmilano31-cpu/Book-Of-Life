import javascript from '@eslint/js';
import globals from 'globals';

export default [
  javascript.configs.recommended,
  {
    files: ['dist/{model,view,control}/**/*.js'],
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
    files: ['tools/qa/**/*.mjs'],
    languageOptions: { globals: globals.browser },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
