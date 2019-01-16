import commonjs from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript2";

export default {
    input: "src/index.ts",
    output: [
        { file: "dist/n-quads-parser.umd.js", name: "NQuadsParser", format: "umd" },
        { file: "dist/n-quads-parser.es6.js", format: "es" },
    ],
    plugins: [
        // Compile TypeScript files
        typescript({
            typescript: require("typescript"),
        }),
        // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
        commonjs(),
    ],
    watch: {
        include: "src/**",
    },
};
