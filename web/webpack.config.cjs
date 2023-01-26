const AssetsPlugin = require('assets-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

const {
  createProdBrowserConfig,
  createDevBrowserConfig,
  createNodeServerRenderingConfig,
} = require('lib/webpack/shared.cjs');

const babelConfig = require('./babel.config.cjs');

const baseBrowserConfig = {
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/@matrix-org/olm/olm.wasm',
          to: path.join(__dirname, 'dist'),
        },
      ],
    }),
  ],
  entry: {
    browser: ['./script.js'],
  },
  output: {
    filename: 'prod.[hash:12].build.js',
    path: path.join(__dirname, 'dist'),
  },
  resolve: {
    alias: {
      '../images': path.resolve('../keyserver/images'),
    },
  },
  node: {
    fs: 'empty',
  },
};

const baseDevBrowserConfig = {
  ...baseBrowserConfig,
  output: {
    ...baseBrowserConfig.output,
    filename: 'dev.build.js',
    pathinfo: true,
    publicPath: 'http://localhost:8080/',
  },
  devServer: {
    hot: true,
    port: 8080,
    contentBase: path.join(__dirname, 'dist'),
    headers: { 'Access-Control-Allow-Origin': '*' },
    allowedHosts: ['all'],
    host: '0.0.0.0',
  },
};

const baseProdBrowserConfig = {
  ...baseBrowserConfig,
  plugins: [
    ...baseBrowserConfig.plugins,
    new AssetsPlugin({
      filename: 'assets.json',
      path: path.join(__dirname, 'dist'),
    }),
  ],
};

const baseNodeServerRenderingConfig = {
  externals: ['react', 'react-dom', 'react-redux'],
  entry: {
    keyserver: ['./loading.react.js'],
  },
  output: {
    filename: 'app.build.cjs',
    library: 'app',
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, 'dist'),
  },
};

module.exports = function (env) {
  const browserConfig =
    env === 'prod'
      ? createProdBrowserConfig(baseProdBrowserConfig, babelConfig)
      : createDevBrowserConfig(baseDevBrowserConfig, babelConfig);
  const nodeConfig = createNodeServerRenderingConfig(
    baseNodeServerRenderingConfig,
    babelConfig,
  );
  const nodeServerRenderingConfig = {
    ...nodeConfig,
    mode: env === 'prod' ? 'production' : 'development',
  };
  return [browserConfig, nodeServerRenderingConfig];
};
