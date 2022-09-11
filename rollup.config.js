import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import { rmSync } from "fs";

import config from "./package.json";

rmSync("./dist", { force: true, recursive: true });

export default [{
    input: "src/exportSvg.ts",
    output: [
        {
            file: config.main,
            format: "umd",
            name: config.name
        },
        {
            file: config.module,
            format: "es",
            name: config.name
        },
        {
            file: `${config.main.replace('.js', '')}.min.js`,
            format: "umd",
            name: config.name,
            plugins: [terser()]
        },
        {
            file: `${config.module.replace('.js', '')}.min.js`,
            format: "es",
            name: "export-svg",
            plugins: [terser()]
        }
    ],
    plugins: [
        typescript({
            removeComments: true,
            declaration: true,
            declarationDir: "types"
        })
    ]
}];
