const path = require('path');
const AssetsPlugin = require('assets-webpack-plugin');

const babelConfig = require('./babel.config.cjs');
const {
  createProdBrowserConfig,
  createDevBrowserConfig,
  createNodeServerRenderingConfig,
} = require('lib/webpack/shared.cjs');

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
