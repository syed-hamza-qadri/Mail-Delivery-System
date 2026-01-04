module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: ['lib/**/*.js', 'email-providers.js', '!**/node_modules/**'],
};
