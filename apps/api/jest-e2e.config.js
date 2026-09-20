// Testes de integração/E2E contra a API real (Supertest) + banco de teste Postgres
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: "test/.*\\.e2e-spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  testEnvironment: "node",
  moduleNameMapper: {
    "^@gestao-pastoral/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/test/setup-e2e.ts"],
};
