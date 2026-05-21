/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  // ESM TS path: ts-jest in ESM mode + treat .ts as ESM.
  extensionsToTreatAsEsm: ['.ts'],
  // Source files import each other with .js suffix (NodeNext convention).
  // Strip that suffix during test resolution so ts-jest can find the .ts source.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        // Override the project tsconfig just for tests so module:NodeNext
        // (which jest's vm modules cannot consume) becomes plain esnext.
        tsconfig: {
          module: 'esnext',
          moduleResolution: 'bundler',
          target: 'es2022',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  // No coverage threshold yet — first pass is just the rollback contract.
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
};
