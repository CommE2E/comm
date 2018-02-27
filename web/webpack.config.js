const webpack = require('webpack');
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

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
    presets: ['react'],
    plugins: [
      ['transform-class-properties', { spec: true }],
      'transform-object-rest-spread',
      ['transform-builtin-extend', { globals: ["Error"] }],
    ],
  },
};

const baseBrowserConfig = {
  entry: ['./script.js'],
  module: {
    rules: [
      {
        ...babelConfig,
        options: {
          ...babelConfig.options,
          presets: [
            ...babelConfig.options.presets,
            ['latest', { 'es2015': { modules: false } }],
          ],
        },
      }
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
      'jquery': path.resolve('./node_modules/jquery'),
      'isomorphic-fetch': path.resolve('./node_modules/isomorphic-fetch'),
    },
  },
};

module.exports = function(env) {
  if (env !== 'prod' && env !== 'dev') {
    env = 'dev';
  }
  let browserConfig = {
    ...baseBrowserConfig,
    output: {
      filename: env + '.build.js',
      path: path.join(__dirname, 'dist'),
    },
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
      entry: [
        'react-hot-loader/patch',
        'webpack-dev-server/client?http://localhost:8080',
        'webpack/hot/only-dev-server',
        ...browserConfig.entry,
      ],
      output: {
        ...browserConfig.output,
        pathinfo: true,
        publicPath: 'http://localhost:8080/',
        hotUpdateChunkFilename: 'hot/hot-update.js',
        hotUpdateMainFilename: 'hot/hot-update.json',
      },
      plugins: [
        ...browserConfig.plugins,
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin(),
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
          {
            test: /\.css$/,
            use: [
              'style-loader',
              {
                ...cssLoader,
                options: {
                  ...cssLoader.options,
                  sourceMap: true,
                },
              },
            ],
          },
        ],
      },
      devtool: 'eval-cheap-module-source-map',
      devServer: {
        hot: true,
        contentBase: __dirname,
        publicPath: 'http://localhost:8080/',
        headers: { 'Access-Control-Allow-Origin': '*' },
      },
    };
  } else {
    browserConfig = {
      ...browserConfig,
      plugins: [
        ...browserConfig.plugins,
        new UglifyJSPlugin(),
        new webpack.DefinePlugin({
          'process.env': {
            NODE_ENV: JSON.stringify('production'),
            BROWSER: true,
          },
        }),
        new ExtractTextPlugin('prod.build.css'),
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
                'transform-react-constant-elements',
                'transform-remove-console',
              ],
            },
          },
          {
            test: /\.css$/,
            use: ExtractTextPlugin.extract({ loader: cssLoader }),
          },
        ],
      },
    };
  }
  const nodeServerRenderingConfig = {
    entry: ['./server-rendering.js', './app.react.js'],
    output: {
      filename: 'app.build.js',
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
      ],
    }
  };
  return [browserConfig, nodeServerRenderingConfig];
};
