const path = require('path');

module.exports = {
  watchFolders: [
    path.resolve(__dirname, '../node_modules'),
    path.resolve(__dirname, '../lib'),
  ],

  server: {
    enhanceMiddleware: middleware => (req, res, next) => {
      // Fix Android dev mode asset resolution for yarn workspaces
      req.url = req.url.replace(/^\/node_modules/, '/assets/../node_modules');
      return middleware(req, res, next);
    },
  },

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
