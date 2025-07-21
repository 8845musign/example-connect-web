import rootConfig from '../eslint.config.js';

export default [
  ...rootConfig,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // Allow console in backend
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
