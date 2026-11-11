module.exports = {
  testEnvironment: 'node',
  testTimeout: 20000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'models/**/*.js',
    'utils/**/*.js',
    'middleware/**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!migrations/**',
    '!jest.config.js',
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 35,
      functions: 50,
      lines: 50
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  verbose: true,
};
