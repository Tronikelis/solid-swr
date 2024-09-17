import * as preset from "tsup-preset-solid";
import { defineConfig } from "tsup";

const presetOptions: preset.PresetOptions = {
    entries: [
        {
            entry: "./src/index.ts",
        },
        {
            entry: "./src/extra.tsx",
            name: "extra",
        },
        {
            entry: "./src/cache.ts",
            name: "cache",
        },
    ],
    drop_console: true,
};

export default defineConfig(config => {
    const watching = !!config.watch;

    const parsedData = preset.parsePresetOptions(presetOptions, watching);

    if (!watching) {
        const packageFields = preset.generatePackageExports(parsedData);

        console.log(`\npackage.json: \n${JSON.stringify(packageFields, null, 2)}\n\n`);

        /*
            will update ./package.json with the correct export fields
        */
        preset.writePackageJson(packageFields);
    }

    return preset.generateTsupOptions(parsedData);
});
