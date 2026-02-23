module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: '../coverage',
  moduleNameMapper: {
    '^@wms/types$': '<rootDir>/../../packages/types/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transformIgnorePatterns: [],
};
