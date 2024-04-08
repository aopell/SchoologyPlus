const { merge } = require("webpack-merge");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const RemoveEmptyScriptsPlugin = require("webpack-remove-empty-scripts");
const srcDir = path.join(__dirname, ".", "src");

const commonConfig = {
    entry: {
        // Typescript Entry Points
        popup: path.join(srcDir, "scripts/popup.ts"),
        options: path.join(srcDir, "scripts/options.ts"),
        background: path.join(srcDir, "scripts/background.ts"),
        content: path.join(srcDir, "scripts/content.ts"),
        offscreen: path.join(srcDir, "scripts/offscreen.ts"),

        // CSS Entry Points
        "styles/all": path.join(srcDir, "styles/all.scss"),
        "styles/modern/all": path.join(srcDir, "styles/modern/all.scss"),
        "styles/lib/jquery-ui": path.join(srcDir, "../node_modules/jquery-ui/themes/base/all.css"),
        "styles/lib/contextmenu": path.join(
            srcDir,
            "../node_modules/jquery-contextmenu/dist/jquery.contextMenu.min.css"
        ),
        "styles/lib/izitoast": path.join(
            srcDir,
            "../node_modules/iziToast/dist/css/iziToast.min.css"
        ),
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
                    MiniCssExtractPlugin.loader,
                    // Creates `style` nodes from JS strings
                    // "style-loader",
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
        new RemoveEmptyScriptsPlugin(),
        new MiniCssExtractPlugin({
            filename: "[name].css",
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
