const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './farcaster-signer.js',
  mode: 'production',
  output: {
    filename: 'farcaster-signer.bundle.js.raw',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-flow'],
            plugins: ['@babel/plugin-transform-flow-strip-types'],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  // The name of the output forces us to configure the minimization
  // manually. Usually, the output extension should be `.js`, but we want
  // to have something different so that the file content can be imported
  // directly, without it being executed. We want this so that this file can
  // be injected into a WebView. Our solution to that is to use
  // babel-plugin-inline-import that imports file content when the `.raw`
  // extension is used. Unfortunately, webpack doesn't minimize `.raw`
  // files - that's why we have to do it manually.
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        test: /\.raw$/i,
      }),
    ],
  },
};
