const path = require('path');

module.exports = {
  watchFolders: [
    path.resolve(__dirname, '../node_modules'),
    path.resolve(__dirname, '../lib'),
  ],

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
