const path = require('path');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

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
    filename: 'prod.[contenthash:12].build.js',
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
    port: 8082,
    headers: { 'Access-Control-Allow-Origin': '*' },
    allowedHosts: ['all'],
    host: '0.0.0.0',
    static: {
      directory: path.join(__dirname, 'dist'),
    },
  },
};

const baseProdBrowserConfig = {
  ...baseBrowserConfig,
  plugins: [
    new WebpackManifestPlugin({
      publicPath: '',
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

module.exports = async function (env) {
  const browserConfigPromise = env.prod
    ? createProdBrowserConfig(baseProdBrowserConfig, babelConfig)
    : createDevBrowserConfig(baseDevBrowserConfig, babelConfig);
  const nodeConfigPromise = createNodeServerRenderingConfig(
    baseNodeServerRenderingConfig,
    babelConfig,
  );
  const [browserConfig, nodeConfig] = await Promise.all([
    browserConfigPromise,
    nodeConfigPromise,
  ]);

  const nodeServerRenderingConfig = {
    ...nodeConfig,
    mode: env.prod ? 'production' : 'development',
  };
  return [browserConfig, nodeServerRenderingConfig];
};
