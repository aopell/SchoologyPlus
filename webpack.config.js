const { merge } = require("webpack-merge");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const srcDir = path.join(__dirname, ".", "src");

const commonConfig = {
    entry: {
        popup: path.join(srcDir, "scripts/popup.ts"),
        options: path.join(srcDir, "scripts/options.ts"),
        background: path.join(srcDir, "scripts/background.ts"),
        content: path.join(srcDir, "scripts/content.ts"),
        offscreen: path.join(srcDir, "scripts/offscreen.ts"),
    },
    output: {
        filename: "[name].js",
        path: path.join(__dirname, "./dist"),
    },
    module: {
        rules: [
            {
                test: /\.(js|ts)x?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.(scss|css)$/,
                use: [
                    // Creates `style` nodes from JS strings
                    "style-loader",
                    // Translates CSS into CommonJS (for postcss-loader because it takes css as input)
                    {
                        loader: "css-loader",
                        options: { url: false },
                    },
                    // Compiles Sass to CSS
                    "sass-loader",
                ],
            },
            {
                test: /\.svg$/,
                use: [
                    {
                        loader: "svg-inline-loader",
                    },
                ],
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: path.resolve("src/static"), to: path.resolve("dist") },
                { from: path.resolve("src/styles"), to: path.resolve("dist/styles") },
                { from: path.resolve("src/html"), to: path.resolve("dist") },
            ],
            options: {},
        }),
    ],
};

const productionConfig = {
    mode: "production",
    devtool: "source-map",
};

const developmentConfig = {
    mode: "development",
    devtool: "inline-source-map",
};

module.exports = (_env, argv) => {
    if (argv.mode === "production") {
        return merge(commonConfig, productionConfig);
    }
    if (argv.mode === "development") {
        return merge(commonConfig, developmentConfig);
    }
};
