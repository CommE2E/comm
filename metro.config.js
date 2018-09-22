const path = require('path');
const getWorkspaces = require('get-yarn-workspaces');
const blacklist = require('metro-config/src/defaults/blacklist');

const workspaces = getWorkspaces(__dirname);

module.exports = {

  projectRoot: path.resolve(__dirname, 'native'),

  watchFolders: [
    path.resolve(__dirname, 'node_modules'),
    ...workspaces,
  ],

  resolver: {
    blacklistRE: blacklist(
      workspaces.map(
        workspacePath =>
          `/${workspacePath.replace(
            /\//g,
            '[/\\\\]'
          )}[/\\\\]node_modules[/\\\\]react-native[/\\\\].*/`
      ),
    ),
    extraNodeModules: {
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
    },
  },

};
