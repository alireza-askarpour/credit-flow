module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/libs', '<rootDir>/apps'],
  testRegex: '.*\\.spec\\.ts$',
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/libs/$1/src',
  },
};
