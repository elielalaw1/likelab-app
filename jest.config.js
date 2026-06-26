/**
 * Jest configuration for LikeLab (Expo SDK 54).
 *
 * Uses the `jest-expo` preset so the same setup can later render React Native
 * components, but the current suite focuses on pure business logic — the most
 * robust place to start: no native mocks, fast, and it locks down the rules
 * that protect the critical flows (TikTok link submit, reward display, deadlines).
 */
module.exports = {
  preset: 'jest-expo',
  // Map the `@/...` path alias from tsconfig so tests import like the app does.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
}
