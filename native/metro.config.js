const path = require('path');
const getWorkspaces = require('get-yarn-workspaces');

const workspaces = getWorkspaces(__dirname);

module.exports = {

  watchFolders: [
    path.resolve(__dirname, '../node_modules'),
    ...workspaces,
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
