const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const AssetsPlugin = require('assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const cssLoader = {
  loader: 'css-loader',
  options: {
    modules: true,
    localIdentName: '[path][name]__[local]--[hash:base64:5]',
  },
};

const babelConfig = {
  test: /\.js$/,
  loader: 'babel-loader',
  exclude: /node_modules\/(?!lib)/,
  options: {
    presets: ['@babel/preset-react', '@babel/preset-flow'],
    plugins: [
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-object-rest-spread',
    ],
  },
};

const baseBrowserConfig = {
  name: "browser",
  entry: {
    browser: ['./script.js'],
  },
  output: {
    filename: 'prod.[hash:12].build.js',
    path: path.join(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        ...babelConfig,
        options: {
          ...babelConfig.options,
          presets: [
            ...babelConfig.options.presets,
            ['@babel/preset-env', { modules: false }],
          ],
        },
      },
      {
        test: /\.png$/,
        loader: "url-loader",
      },
    ],
  },
  resolve: {
    // This is necessary so that webpack doesn't differentiate the
    // node_modules/lib symlink from a normal folder
    symlinks: false,
    // npm uses a tree-link structure for dependencies, which means that we
    // can get multiple versions of a library if it's used in different parts
    // of the dependency tree. This is convenient for avoiding versioning
    // conflicts and the such, but it increases the bundle size a lot.
    // Instead, here we force all dependencies to use our copies of these big
    // and common libraries.
    alias: {
      'react': path.resolve('./node_modules/react'),
      'lodash': path.resolve('./node_modules/lodash'),
      'isomorphic-fetch': path.resolve('./node_modules/isomorphic-fetch'),
      '../images': path.resolve('../server/images'),
    },
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
      }),
      new OptimizeCssAssetsPlugin(),
    ],
  },
};

module.exports = function(env) {
  if (env !== 'prod' && env !== 'dev') {
    env = 'dev';
  }
  let browserConfig = {
    ...baseBrowserConfig,
    plugins: [
      new webpack.LoaderOptionsPlugin({
        minimize: env === 'prod',
        debug: env === 'dev',
      }),
    ],
  };
  if (env === "dev") {
    browserConfig = {
      ...browserConfig,
      mode: "development",
      output: {
        ...browserConfig.output,
        filename: 'dev.build.js',
        pathinfo: true,
        publicPath: 'http://localhost:8080/',
        hotUpdateChunkFilename: 'hot/hot-update.js',
        hotUpdateMainFilename: 'hot/hot-update.json',
      },
      plugins: [
        ...browserConfig.plugins,
        new webpack.HotModuleReplacementPlugin(),
        new webpack.DefinePlugin({
          'process.env': {
            NODE_ENV: JSON.stringify('dev'),
            BROWSER: true,
          },
        }),
      ],
      module: {
        ...browserConfig.module,
        rules: [
          {
            ...browserConfig.module.rules[0],
            options: {
              ...browserConfig.module.rules[0].options,
              plugins: [
                ...browserConfig.module.rules[0].options.plugins,
                'react-hot-loader/babel',
              ],
            },
          },
          browserConfig.module.rules[1],
          {
            test: /\.css$/,
            exclude: /node_modules\/.*\.css$/,
            use: [
              {
                loader: 'style-loader',
                options: {
                  sourceMap: true,
                },
              },
              cssLoader,
            ],
          },
          {
            test: /node_modules\/.*\.css$/,
            use: [
              {
                loader: 'style-loader',
                options: {
                  sourceMap: true,
                },
              },
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
        contentBase: __dirname,
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
      mode: "production",
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
        ...browserConfig.module,
        rules: [
          {
            ...browserConfig.module.rules[0],
            options: {
              ...browserConfig.module.rules[0].options,
              plugins: [
                ...browserConfig.module.rules[0].options.plugins,
                '@babel/plugin-transform-react-constant-elements',
                'transform-remove-console',
              ],
            },
          },
          browserConfig.module.rules[1],
          {
            test: /\.css$/,
            exclude: /node_modules\/.*\.css$/,
            use: [
              {
                loader: MiniCssExtractPlugin.loader,
              },
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
              {
                loader: MiniCssExtractPlugin.loader,
              },
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
    name: "server",
    mode: env === "dev" ? "development" : "production",
    entry: {
      server: ['./server-rendering.js', './app.react.js'],
    },
    output: {
      filename: 'app.build',
      library: 'app',
      libraryTarget: 'commonjs2',
      path: path.join(__dirname, 'dist'),
    },
    module: {
      rules: [
        babelConfig,
        {
          test: /\.css$/,
          use: {
            ...cssLoader,
            loader: 'css-loader/locals',
          },
        },
        browserConfig.module.rules[1],
      ],
    },
  };
  return [browserConfig, nodeServerRenderingConfig];
};
