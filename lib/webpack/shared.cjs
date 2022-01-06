const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

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
  test: /\.(png|svg|woff2|woff)$/,
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
    entry: {
      ...browserConfig.entry,
      browser: ['react-hot-loader/patch', ...browserConfig.entry.browser],
    },
    mode: 'development',
    plugins: [
      ...browserConfig.plugins,
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('development'),
          BROWSER: true,
        },
      }),
    ],
    module: {
      rules: [
        {
          ...babelRule,
          options: {
            ...babelRule.options,
            plugins: ['react-hot-loader/babel', ...babelRule.options.plugins],
          },
        },
        imageRule,
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
    resolve: {
      ...browserConfig.resolve,
      alias: {
        ...browserConfig.resolve.alias,
        'react-dom': '@hot-loader/react-dom',
      },
    },
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
    plugins: sharedPlugins,
  };
}

module.exports = {
  createProdBrowserConfig,
  createDevBrowserConfig,
  createNodeServerRenderingConfig,
};
