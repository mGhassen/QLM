import eslintConfigBase from '@guepard/eslint-config/base.js';

export default [
  ...eslintConfigBase,
  {
    ignores: ['**/*.js', '**/*.js.map'],
  },
];
