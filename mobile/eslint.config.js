// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/**', '.expo/**', 'node_modules/**', 'android/**', 'ios/**'],
  },
  {
    files: ['jest.setup.js', '**/__tests__/**', '**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: { jest: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly', beforeEach: 'readonly' },
    },
  },
];
