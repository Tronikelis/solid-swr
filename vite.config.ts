import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    root: "./src/dev",
    plugins: [solidPlugin(), tsConfigPaths()],
});
