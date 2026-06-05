const globals = require('globals');

module.exports = [
  {
    files: ['src/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'warn',
      'eqeqeq': ['warn', 'smart'],
    },
  },
];
