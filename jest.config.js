module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        moduleResolution: 'node',
        baseUrl: '.',
        rootDir: '.',
        esModuleInterop: true,
      },
    }],
  },
  collectCoverageFrom: [
    'contracts/**/*.ts',
    '!contracts/**/*.d.ts',
    '!contracts/**/index.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
};
