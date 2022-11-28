const babel = require('@babel/core');
const { PluginBase } = require('@electron-forge/plugin-base');
const fs = require('fs-extra');
const klaw = require('klaw');
const path = require('path');

const transformDirectoryWithBabel = async (dirPath, outDirPath) => {
  for await (const { path: filePath, stats } of klaw(dirPath)) {
    if (stats.isFile()) {
      const outPath = path.resolve(
        outDirPath,
        path.relative(dirPath, filePath),
      );

      const { code } = await new Promise(resolve =>
        babel.transformFile(filePath, (err, result) => {
          if (err) {
            console.error(err);
          }
          resolve(result);
        }),
      );
      if (code) {
        await fs.outputFile(outPath, code);
      }
    }
  }
};

const runBabel = async () => {
  await Promise.all([
    fs.outputFile('./dist/package.json', JSON.stringify({ type: 'commonjs' })),
    transformDirectoryWithBabel('./src', './dist'),
  ]);
};

class BabelPlugin extends PluginBase {
  name = 'BabelPlugin';

  getHooks() {
    return {
      // This hook runs during the packaging of the final executable
      prePackage: [runBabel],
    };
  }

  // This function runs only in development mode, just before the
  // application starts
  async startLogic() {
    await runBabel();
    // startLogic allows us to run electron ourselves and return the process
    // object. Electron Forge (package which handles bundling, packaging and
    // running dev mode) will then watch it instead of spawing electron by
    // itself. But we are fine with the default behaviour (Electron Forge
    // spawning electron) so we return false.
    return false;
  }
}

module.exports = {
  packagerConfig: {
    name: 'Comm',
    icon: 'icons/icon',
    ignore: ['src', '.*config\\.cjs', '\\.eslintrc\\.json'],
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
  plugins: [new BabelPlugin()],
  hooks: {
    generateAssets: async () => {
      await Promise.all([
        fs.copy('../keyserver/fonts', './assets/fonts'),
        fs.copy('../web/theme.css', './assets/theme.css'),
        fs.copy('../web/typography.css', './assets/typography.css'),
      ]);
    },
  },
};
