module.exports = {
  env: {
    es2022: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'eqeqeq': ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-duplicate-imports': 'error',
  },
  ignorePatterns: ['node_modules/', 'dist/', '*.test.js'],
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: { jest: true },
      rules: {
        'no-unused-vars': 'off',
      },
    },
  ],
};