const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Add fallbacks for Node.js modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        buffer: require.resolve("buffer"),
        process: require.resolve("process/browser"),
        stream: require.resolve("stream-browserify"),
        util: require.resolve("util"),
        crypto: require.resolve("crypto-browserify"),
        vm: require.resolve("vm-browserify"),
        fs: false,
        net: false,
        tls: false,
      };

      // Add plugins to provide globals
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          process: "process/browser",
          Buffer: ["buffer", "Buffer"],
        }),
      ];

      return webpackConfig;
    },
  },
};
