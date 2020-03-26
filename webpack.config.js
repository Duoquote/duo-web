const config = require("./config.js");
const path = require("path");

module.exports = {
  mode: "production",
  entry: {
    js: ["@babel/polyfill", path.resolve(config.SRC_DIR, "main.js")],
    lazy: ["bootstrap", path.resolve(config.SRC_DIR, "filler.js")],
    ie9: path.resolve(config.SRC_DIR, "ie9.js"),
    css: path.resolve(config.SRC_DIR, "main.scss")
  },
  output: {
    filename: "[name].app.js",
    chunkFilename: "[name].app.js",
    path: path.resolve(config.DIST_DIR, "dist"),
    publicPath: "dist/"
  },
  optimization: {
    splitChunks: {
      chunks: "async",
      maxSize: 500 * 512,
      minChunks: 2
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env"
            ],
          }
        }
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              sassOptions: {
                outputStyle: "compressed"
              }
            }
          },
          "postcss-loader"
        ]
      },
      {
        test: /\.(png|jpe?g|svg|ico|woff)$/i,
        use: "file-loader"
      }
    ]
  }
}
