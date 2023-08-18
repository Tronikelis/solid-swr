import { JestConfigWithTsJest } from "ts-jest";

export default {
    preset: "ts-jest",
    testMatch: ["**/tests/**/*.test.{ts,tsx}"],
    testEnvironment: "jsdom",
    setupFiles: ["<rootDir>/jest.setup.ts"],
    testTimeout: 10e3,

    transform: {
        ".*": [
            "ts-jest",
            {
                tsconfig: "tsconfig.json",
                babelConfig: {
                    presets: ["babel-preset-solid", "@babel/preset-env"],
                },
            },
        ],
    },

    // bruh
    moduleNameMapper: {
        "^~/(.*)$": "<rootDir>/src/lib/$1",
    },
} satisfies JestConfigWithTsJest;
