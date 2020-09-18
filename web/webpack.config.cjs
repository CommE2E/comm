const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const AssetsPlugin = require('assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const babelConfig = require('./babel.config.cjs');

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

const babelRule = {
  test: /\.js$/,
  exclude: /node_modules\/(?!lib)/,
  loader: 'babel-loader',
  options: babelConfig,
};
const browserBabelRule = {
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

const imageRule = {
  test: /\.png$/,
  use: [ 'url-loader' ],
};

const baseBrowserConfig = {
  name: 'browser',
  entry: {
    browser: [ './script.js' ],
  },
  output: {
    filename: 'prod.[hash:12].build.js',
    path: path.join(__dirname, 'dist'),
  },
  resolve: {
    alias: {
      '../images': path.resolve('../server/images'),
    },
  },
  optimization: {
    minimizer: [
      new TerserPlugin(),
      new OptimizeCssAssetsPlugin(),
    ],
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [],
    }),
  ],
};

module.exports = function(env) {
  if (env !== 'prod' && env !== 'dev') {
    env = 'dev';
  }
  let browserConfig = baseBrowserConfig;
  if (env === 'dev') {
    browserConfig = {
      ...browserConfig,
      entry: {
        ...browserConfig.entry,
        browser: [
          'react-hot-loader/patch',
          ...browserConfig.entry.browser,
        ],
      },
      mode: 'development',
      output: {
        ...browserConfig.output,
        filename: 'dev.build.js',
        pathinfo: true,
        publicPath: 'http://localhost:8080/',
      },
      plugins: [
        ...browserConfig.plugins,
        new webpack.DefinePlugin({
          'process.env': {
            NODE_ENV: JSON.stringify('dev'),
            BROWSER: true,
          },
        }),
      ],
      module: {
        rules: [
          {
            ...browserBabelRule,
            options: {
              ...browserBabelRule.options,
              plugins: [
                'react-hot-loader/babel',
                ...browserBabelRule.options.plugins,
              ],
            },
          },
          imageRule,
          {
            test: /\.css$/,
            exclude: /node_modules\/.*\.css$/,
            use: [
              styleLoader,
              cssLoader,
            ],
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
      devServer: {
        hot: true,
        port: 8080,
        contentBase: path.join(__dirname, 'dist'),
        headers: { 'Access-Control-Allow-Origin': '*' },
      },
      resolve: {
        ...browserConfig.resolve,
        alias: {
          ...browserConfig.resolve.alias,
          'react-dom': '@hot-loader/react-dom',
        },
      },
    };
  } else {
    browserConfig = {
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
        new AssetsPlugin({
          filename: 'assets.json',
          path: path.join(__dirname, 'dist'),
        }),
      ],
      module: {
        rules: [
          {
            ...browserBabelRule,
            options: {
              ...browserBabelRule.options,
              plugins: [
                ...browserBabelRule.options.plugins,
                '@babel/plugin-transform-react-constant-elements',
                'transform-remove-console',
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
            ]
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
            ]
          },
        ],
      },
    };
  }
  const nodeServerRenderingConfig = {
    name: 'server',
    target: 'node',
    externals: [ 'react', 'react-dom', 'react-redux' ],
    mode: env === 'dev' ? 'development' : 'production',
    entry: {
      server: [ './server-rendering.js', './app.react.js' ],
    },
    output: {
      filename: 'app.build.cjs',
      library: 'app',
      libraryTarget: 'commonjs2',
      path: path.join(__dirname, 'dist'),
    },
    module: {
      rules: [
        babelRule,
        {
          test: /\.css$/,
          use: {
            ...cssLoader,
            options: {
              ...cssLoader.options,
              modules: {
                ...cssLoader.options.modules,
                exportOnlyLocals: true,
              }
            },
          },
        },
      ],
    },
  };
  return [ browserConfig, nodeServerRenderingConfig ];
};
