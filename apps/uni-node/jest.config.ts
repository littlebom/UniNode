import type { Config } from 'jest'

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@noble|@scure)/)',
  ],
  collectCoverageFrom: ['**/*.ts', '!**/index.ts', '!**/*.entity.ts', '!**/main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@unilink/dto$': '<rootDir>/../../../packages/dto/src',
    '^@unilink/crypto$': '<rootDir>/../../../packages/crypto/src',
    '^@unilink/vc-core$': '<rootDir>/../../../packages/vc-core/src',
  },
}

export default config
