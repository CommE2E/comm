const AssetsPlugin = require('assets-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const {
  createProdBrowserConfig,
  createDevBrowserConfig,
  createNodeServerRenderingConfig,
} = require('lib/webpack/shared.cjs');

const babelConfig = require('./babel.config.cjs');

const baseBrowserConfig = {
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
};

const baseDevBrowserConfig = {
  ...baseBrowserConfig,
  output: {
    ...baseBrowserConfig.output,
    filename: 'dev.build.js',
    pathinfo: true,
    publicPath: 'http://localhost:8082/',
  },
  devServer: {
    hot: true,
    port: 8082,
    contentBase: path.join(__dirname, 'dist'),
    headers: { 'Access-Control-Allow-Origin': '*' },
    allowedHosts: ['all'],
    host: '0.0.0.0',
  },
};

const baseProdBrowserConfig = {
  ...baseBrowserConfig,
  plugins: [
    new AssetsPlugin({
      filename: 'assets.json',
      path: path.join(__dirname, 'dist'),
    }),
  ],
};

const baseNodeServerRenderingConfig = {
  externals: ['react', 'react-dom', 'react-redux'],
  entry: {
    server: ['./landing-ssr.react.js'],
  },
  output: {
    filename: 'landing.build.cjs',
    library: 'landing',
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, 'dist'),
  },
};

const alchemyKey = process.env.COMM_ALCHEMY_KEY;

module.exports = function (env) {
  const rawBrowserConfig =
    env === 'prod'
      ? createProdBrowserConfig(baseProdBrowserConfig, babelConfig)
      : createDevBrowserConfig(baseDevBrowserConfig, babelConfig);
  const browserConfig = {
    ...rawBrowserConfig,
    plugins: [
      ...rawBrowserConfig.plugins,
      new webpack.DefinePlugin({
        'process.env': {
          COMM_ALCHEMY_KEY: JSON.stringify(alchemyKey),
        },
      }),
    ],
  };
  const baseNodeConfig = createNodeServerRenderingConfig(
    baseNodeServerRenderingConfig,
    babelConfig,
  );
  const nodeConfig = {
    ...baseNodeConfig,
    mode: env === 'prod' ? 'production' : 'development',
    plugins: [
      ...baseNodeConfig.plugins,
      new webpack.DefinePlugin({
        'process.env': {
          COMM_ALCHEMY_KEY: JSON.stringify(alchemyKey),
        },
      }),
    ],
  };
  return [browserConfig, nodeConfig];
};
