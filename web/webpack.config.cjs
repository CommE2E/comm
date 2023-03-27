const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

const {
  createProdBrowserConfig,
  createDevBrowserConfig,
  createNodeServerRenderingConfig,
  createWebWorkersConfig,
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
    fallback: {
      crypto: false,
      fs: false,
      path: false,
    },
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
    port: 8080,
    headers: { 'Access-Control-Allow-Origin': '*' },
    allowedHosts: ['all'],
    host: '0.0.0.0',
    static: {
      directory: path.join(__dirname, 'dist'),
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/@matrix-org/olm/olm.wasm',
          to: path.join(__dirname, 'dist'),
        },
      ],
    }),
    new CopyPlugin({
      patterns: [
        {
          from:
            'node_modules/@commapp/opaque-ke-wasm' +
            '/pkg/comm_opaque2_wasm_bg.wasm',
          to: path.join(__dirname, 'dist', 'opaque-ke.wasm'),
        },
      ],
    }),
  ],
};

const baseProdBrowserConfig = {
  ...baseBrowserConfig,
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/@matrix-org/olm/olm.wasm',
          to: path.join(__dirname, 'dist', 'olm.[contenthash:12].wasm'),
        },
      ],
    }),
    new CopyPlugin({
      patterns: [
        {
          from:
            'node_modules/@commapp/opaque-ke-wasm' +
            '/pkg/comm_opaque2_wasm_bg.wasm',
          to: path.join(__dirname, 'dist', 'opaque-ke.[contenthash:12].wasm'),
        },
      ],
    }),
    new WebpackManifestPlugin({
      publicPath: '',
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

const baseWebWorkersConfig = {
  entry: {
    pushNotif: './push-notif/service-worker.js',
    database: './database/worker/db-worker.js',
  },
  output: {
    filename: '[name].build.js',
    path: path.join(__dirname, 'dist', 'webworkers'),
  },
  resolve: {
    fallback: {
      crypto: false,
      fs: false,
      path: false,
    },
  },
};

const devWebWorkersPlugins = [
  new CopyPlugin({
    patterns: [
      {
        from: 'node_modules/sql.js/dist/sql-wasm.wasm',
        to: path.join(__dirname, 'dist', 'webworkers'),
      },
    ],
  }),
];

const prodWebWorkersPlugins = [
  new CopyPlugin({
    patterns: [
      {
        from: 'node_modules/sql.js/dist/sql-wasm.wasm',
        to: path.join(
          __dirname,
          'dist',
          'webworkers',
          'sql-wasm.[contenthash:12].wasm',
        ),
      },
    ],
  }),
  new WebpackManifestPlugin({
    publicPath: '',
  }),
];

module.exports = function (env) {
  const browserConfig = env.prod
    ? createProdBrowserConfig(baseProdBrowserConfig, babelConfig)
    : createDevBrowserConfig(baseDevBrowserConfig, babelConfig);
  const nodeConfig = createNodeServerRenderingConfig(
    baseNodeServerRenderingConfig,
    babelConfig,
  );
  const nodeServerRenderingConfig = {
    ...nodeConfig,
    mode: env.prod ? 'production' : 'development',
  };

  const workersConfig = {
    ...baseWebWorkersConfig,
    plugins: env.prod ? prodWebWorkersPlugins : devWebWorkersPlugins,
  };
  const webWorkersConfig = createWebWorkersConfig(
    env,
    workersConfig,
    babelConfig,
  );
  return [browserConfig, nodeServerRenderingConfig, webWorkersConfig];
};
