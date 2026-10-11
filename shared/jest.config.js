/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // testRegex rather than testMatch: glob matching skips dot-directories anywhere in the path (e.g. .claude/worktrees).
  testRegex: '\.test\.ts$',
};
