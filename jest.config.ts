import { JestConfigWithTsJest } from "ts-jest";

export default {
    preset: "ts-jest",
    testMatch: ["**/tests/**/*.test.ts"],
    testEnvironment: "jsdom",
    setupFiles: ["<rootDir>/jest.setup.ts"],
    testTimeout: 10e3,
    // globals: {
    //     "ts-jest": {
    //         tsconfig: "tsconfig.json",
    //         babelConfig: {
    //             presets: ["babel-preset-solid", "@babel/preset-env"],
    //         },
    //     },
    // },
    // setupFiles: ["node_modules/@testing-library/jest-dom/extend-expect"],
    moduleNameMapper: {
        "solid-js/web": "<rootDir>/node_modules/solid-js/web/dist/web.cjs",
        "solid-js": "<rootDir>/node_modules/solid-js/dist/solid.cjs",
    },
} satisfies JestConfigWithTsJest;
