import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Sources import siblings as `./x.ts`; ts-jest rewrites those to `.js`.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }] },
  testTimeout: 30000,
};

export default config;
