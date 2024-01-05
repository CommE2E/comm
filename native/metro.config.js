/* eslint-disable flowtype/require-valid-file-annotation */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    path.resolve(__dirname, '../node_modules'),
    path.resolve(__dirname, '../lib'),
  ],

  resolver: {
    blockList: [/android[/\\].*/, /ios[/\\].*/],
  },

  server: {
    enhanceMiddleware: middleware => (req, res, next) => {
      // Fix Android dev mode asset resolution for yarn workspaces
      req.url = req.url.replace(/^\/node_modules/, '/assets/../node_modules');
      return middleware(req, res, next);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
