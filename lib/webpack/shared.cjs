const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

const sharedPlugins = [
  new webpack.optimize.LimitChunkCountPlugin({
    maxChunks: 1,
  }),
];

const cssLoader = {
  loader: 'css-loader',
  options: {
    modules: {
      mode: 'local',
      localIdentName: '[path][name]__[local]--[hash:base64:5]',
    },
  },
};
const cssExtractLoader = {
  loader: MiniCssExtractPlugin.loader,
  options: {
    esModule: true,
  },
};
const styleLoader = {
  loader: 'style-loader',
  options: {
    esModule: true,
  },
};

function getBabelRule(babelConfig) {
  return {
    test: /\.js$/,
    exclude: /node_modules\/(?!lib)/,
    loader: 'babel-loader',
    options: babelConfig,
  };
}
function getBrowserBabelRule(babelConfig) {
  const babelRule = getBabelRule(babelConfig);
  return {
    ...babelRule,
    options: {
      ...babelRule.options,
      presets: [
        ...babelRule.options.presets,
        [
          '@babel/preset-env',
          {
            targets: 'defaults',
            useBuiltIns: 'usage',
            corejs: '3.6',
          },
        ],
      ],
    },
  };
}

const imageRule = {
  test: /\.(png|svg)$/,
  use: ['url-loader'],
};

const typographyRule = {
  test: /\.(woff2|woff)$/,
  use: ['url-loader'],
};

function createBaseBrowserConfig(baseConfig) {
  return {
    ...baseConfig,
    name: 'browser',
    optimization: {
      minimizer: [new TerserPlugin(), new OptimizeCssAssetsPlugin()],
    },
    plugins: [
      ...(baseConfig.plugins ?? []),
      ...sharedPlugins,
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [],
      }),
    ],
  };
}

const alchemyKey = process.env.COMM_ALCHEMY_KEY;

function createProdBrowserConfig(baseConfig, babelConfig) {
  const browserConfig = createBaseBrowserConfig(baseConfig);
  const babelRule = getBrowserBabelRule(babelConfig);
  return {
    ...browserConfig,
    mode: 'production',
    plugins: [
      ...browserConfig.plugins,
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('production'),
          BROWSER: true,
          COMM_ALCHEMY_KEY: JSON.stringify(alchemyKey),
        },
      }),
      new MiniCssExtractPlugin({
        filename: 'prod.[contenthash:12].build.css',
      }),
    ],
    module: {
      rules: [
        {
          ...babelRule,
          options: {
            ...babelRule.options,
            plugins: [
              ...babelRule.options.plugins,
              '@babel/plugin-transform-react-constant-elements',
              ['transform-remove-console', { exclude: ['error', 'warn'] }],
            ],
          },
        },
        {
          test: /\.css$/,
          exclude: /node_modules\/.*\.css$/,
          use: [
            cssExtractLoader,
            {
              ...cssLoader,
              options: {
                ...cssLoader.options,
                url: false,
              },
            },
          ],
        },
        {
          test: /node_modules\/.*\.css$/,
          sideEffects: true,
          use: [
            cssExtractLoader,
            {
              ...cssLoader,
              options: {
                ...cssLoader.options,
                url: false,
                modules: false,
              },
            },
          ],
        },
      ],
    },
  };
}

function createDevBrowserConfig(baseConfig, babelConfig) {
  const browserConfig = createBaseBrowserConfig(baseConfig);
  const babelRule = getBrowserBabelRule(babelConfig);
  return {
    ...browserConfig,
    mode: 'development',
    plugins: [
      ...browserConfig.plugins,
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('development'),
          BROWSER: true,
          COMM_ALCHEMY_KEY: JSON.stringify(alchemyKey),
        },
      }),
      new ReactRefreshWebpackPlugin(),
    ],
    module: {
      rules: [
        {
          ...babelRule,
          options: {
            ...babelRule.options,
            plugins: [
              require.resolve('react-refresh/babel'),
              ...babelRule.options.plugins,
            ],
          },
        },
        imageRule,
        typographyRule,
        {
          test: /\.css$/,
          exclude: /node_modules\/.*\.css$/,
          use: [styleLoader, cssLoader],
        },
        {
          test: /node_modules\/.*\.css$/,
          use: [
            styleLoader,
            {
              ...cssLoader,
              options: {
                ...cssLoader.options,
                modules: false,
              },
            },
          ],
        },
      ],
    },
    devtool: 'eval-cheap-module-source-map',
  };
}

function createNodeServerRenderingConfig(baseConfig, babelConfig) {
  return {
    ...baseConfig,
    name: 'server',
    target: 'node',
    module: {
      rules: [
        getBabelRule(babelConfig),
        {
          test: /\.css$/,
          use: {
            ...cssLoader,
            options: {
              ...cssLoader.options,
              modules: {
                ...cssLoader.options.modules,
                exportOnlyLocals: true,
              },
            },
          },
        },
      ],
    },
    plugins: [
      ...sharedPlugins,
      new webpack.DefinePlugin({
        'process.env': {
          COMM_ALCHEMY_KEY: JSON.stringify(alchemyKey),
        },
      }),
    ],
  };
}

module.exports = {
  createProdBrowserConfig,
  createDevBrowserConfig,
  createNodeServerRenderingConfig,
};
