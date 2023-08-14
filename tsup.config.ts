import { defineConfig } from "tsup";

export default defineConfig({
    clean: true,
    format: ["cjs", "esm"],
    entry: ["./src/solid-swr/index.ts"],
    dts: true,
});
