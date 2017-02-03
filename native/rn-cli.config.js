const defaultConfig = require('react-native/local-cli/default.config.js');
const path = require('path');

module.exports = {
  getProjectRoots() {
    const roots = defaultConfig.getProjectRoots();
    roots.unshift(path.resolve(__dirname, '../lib'));
    return roots;
  },
};
