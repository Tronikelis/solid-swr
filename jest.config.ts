import { JestConfigWithTsJest } from "ts-jest";

export default {
    preset: "ts-jest",
    testMatch: ["**/tests/**/*.test.ts"],
    testEnvironment: "jsdom",
    setupFiles: ["<rootDir>/jest.setup.ts"],
    testTimeout: 10e3,
} satisfies JestConfigWithTsJest;
