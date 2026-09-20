// Testes unitários, colocalizados em src/ como *.spec.ts
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.(t|j)s", "!**/*.module.ts", "!main.ts"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@gestao-pastoral/shared$": "<rootDir>/../../../packages/shared/src/index.ts",
  },
};
