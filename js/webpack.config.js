const webpack = require('webpack');
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = function(env) {
  if (env !== 'prod' && env !== 'dev') {
    env = 'dev';
  }
  const config = {
    entry: './script.js',
    output: {
      filename: env + '.build.js',
      path: __dirname
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: /node_modules/,
          options: {
            presets: [
              'react',
              ['latest', { modules: false }]
            ],
            plugins: [
              ['transform-class-properties', { spec: true }]
            ]
          }
        }
      ]
    },
    plugins: [
      new webpack.LoaderOptionsPlugin({
        minimize: env === 'prod',
        debug: env === 'dev'
      })
    ]
  };
  const cssLoader = {
    loader: 'css-loader',
    options: {
      modules: true,
      localIdentName: '[path][name]__[local]--[hash:base64:5]',
      sourceMap: env !== 'prod'
    }
  };
  if (env === 'prod') {
    config.plugins.push(new UglifyJSPlugin());
    config.plugins.push(new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    }));
    config.module.rules.push({
      test: /\.css$/,
      use: ExtractTextPlugin.extract({ loader: cssLoader })
    });
    config.plugins.push(new ExtractTextPlugin('prod.build.css'));
  } else if (env === 'dev') {
    config.devtool = 'eval-cheap-module-source-map';
    config.output.pathinfo = true;
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', cssLoader]
    });
  }
  return config;
};
