import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
    viteConfig,
    defineConfig({
        root: process.cwd(),
        test: {
            environment: "jsdom",
            testTransformMode: { web: ["/.[jt]sx?$/"] },
        },
    })
);
