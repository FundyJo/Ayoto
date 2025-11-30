module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  rules: {
    // Example rules set to 'warn' instead of 'error'
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    'react/prop-types': 'warn',
  },

}
