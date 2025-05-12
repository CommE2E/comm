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

config.server.enhanceMiddleware = middleware => (req, res, next) => {
  // Fix Android dev mode asset resolution for yarn workspaces
  req.url = req.url.replace(/^\/node_modules/, '/assets/../node_modules');
  return middleware(req, res, next);
};

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
