import commonjs from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript2";

export default {
    input: "src/index.ts",
    output: [
        { file: "dist/n-quads-parser.umd.js", name: "NQuadsParser", format: "umd" },
    ],
    plugins: [
        // Compile TypeScript files
        typescript({
            tsconfigOverride: {
                compilerOptions: {
                    target: "es5",
                },
            },
            typescript: require("typescript"),
        }),
        // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
        commonjs(),
    ],
    watch: {
        include: "src/**",
    },
};
