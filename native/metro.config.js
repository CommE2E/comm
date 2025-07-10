/* eslint-disable ft-flow/require-valid-file-annotation */

// eslint-disable-next-line import/extensions
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
// This can be replaced with `find-yarn-workspace-root`
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.resolve(__dirname, '../node_modules'),
  path.resolve(__dirname, '../lib'),
];

config.resolver.blockList = [/android[/\\].*/, /ios[/\\].*/];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.unstable_enablePackageExports = false;

module.exports = config;
