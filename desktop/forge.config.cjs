const babel = require('@babel/core');
const { PluginBase } = require('@electron-forge/plugin-base');
const fs = require('fs-extra');
const { request } = require('gaxios');
const klaw = require('klaw');
const { execFileSync } = require('node:child_process');
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

const optionsForFile = filePath => {
  const entitlements =
    process.env?.ENV === 'dev'
      ? 'entitlements-dev.plist'
      : 'entitlements.plist';

  const basename = path.basename(filePath);
  if (basename === 'Comm' || basename === 'Comm.app') {
    return { entitlements };
  }

  return {};
};

const signingOptions = {
  packagerMacos: {},
  makerMacos: {},
  makerWindows: {},
};
if (process.env?.ENV === 'dev') {
  if (fs.existsSync('macOS_App_Development_Profile.provisionprofile')) {
    signingOptions.packagerMacos = {
      osxSign: {
        identity: 'Development',
        preEmbedProvisioningProfile: true,
        provisioningProfile: 'macOS_App_Development_Profile.provisionprofile',
        optionsForFile,
      },
    };
  }
} else {
  signingOptions.packagerMacos = {
    osxSign: {
      identity: 'Developer ID Application',
      preEmbedProvisioningProfile: true,
      provisioningProfile: 'macOS_App_Provisioning_Profile.provisionprofile',
      optionsForFile,
    },
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env?.APPLE_USER_NAME,
      appleIdPassword: process.env?.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env?.TEAM_ID,
    },
  };
  signingOptions.makerMacos = {
    'code-sign': {
      'signing-identity': 'Developer ID Application',
      'identifier': 'app.comm.macos',
    },
  };
  signingOptions.makerWindows = {
    certificateFile: process.env?.WINDOWS_CERTIFICATE,
    certificatePassword: process.env?.WINDOWS_PASSWORD,
  };
}

const macIconPackage = path.resolve(__dirname, '../lib/icons/apple.icon');
const macIconOutDir = path.resolve(__dirname, 'build', 'macos-assets');
const macIconCarPath = path.join(macIconOutDir, 'Assets.car');
const macIconPartialPlist = path.join(macIconOutDir, 'PartialInfo.plist');

async function compileMacAppIcon() {
  if (!fs.existsSync(macIconPackage)) {
    throw new Error(`App icon not found at ${macIconPackage}`);
  }
  await fs.ensureDir(macIconOutDir);
  execFileSync('xcrun', [
    'actool',
    macIconPackage,
    '--compile',
    macIconOutDir,
    '--platform',
    'macosx',
    '--app-icon',
    'apple',
    '--include-all-app-icons',
    '--minimum-deployment-target',
    '11.0',
    '--output-partial-info-plist',
    macIconPartialPlist,
  ]);
  if (!fs.existsSync(macIconCarPath)) {
    throw new Error('actool finished but Assets.car was not generated');
  }
}

module.exports = {
  packagerConfig: {
    name: 'Comm',
    // Legacy .icns file for DMG icon and older macOS. Replaced by .icon dir
    icon: 'icons/icon',
    ignore: [
      'src',
      '.*config\\.cjs',
      '\\.eslintrc\\.json',
      '\\.flowconfig',
      'flow-typed',
      'addons',
    ],
    appBundleId: 'app.comm.macos',
    extraResource: process.platform === 'darwin' ? [macIconCarPath] : [],
    extendInfo: {
      CFBundleIconName: 'apple', // Modern .icon dir
      CFBundleIconFile: 'icon.icns', // Legacy .icns file
    },
    ...signingOptions.packagerMacos,
  },
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        icon: 'icons/icon.icns',
        background: 'icons/dmg_background.png',
        additionalDMGOptions: { ...signingOptions.makerMacos },
        contents: opts => [
          { x: 340, y: 100, type: 'link', path: '/Applications' },
          { x: 100, y: 100, type: 'file', path: opts.appPath },
        ],
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'Comm',
        title: 'Comm',
        authors: 'Comm Technologies, Inc.',
        description: 'Comm is a private messaging app for communities!',
        iconUrl: 'https://comm-external.s3.amazonaws.com/icon.ico',
        setupIcon: 'icons/icon.ico',
        loadingGif: 'icons/win_installer.gif',
        ...signingOptions.makerWindows,
      },
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
    prePackage: async (forgeConfig, platform, arch) => {
      if (
        arch === 'universal' &&
        (fs.existsSync('./out/Comm-darwin-x64') ||
          fs.existsSync('./out/Comm-darwin-arm64'))
      ) {
        throw new Error(
          'Due to a bug in @electron/universal, please first run ' +
            '`yarn clean-build` or remove previous builds artifacts: ' +
            '"out/Comm-darwin-x64" and/or "out/Comm-darwin-arm64"\n',
        );
      }

      if (platform === 'darwin') {
        await compileMacAppIcon();
      }

      if (platform === 'win32') {
        const file = fs.createWriteStream(
          './assets/windows-runtime-installer.exe',
        );
        const response = await request({
          url: 'https://aka.ms/windowsappsdk/1.2/1.2.230313.1/windowsappruntimeinstall-x64.exe',
          responseType: 'stream',
        });
        response.data.pipe(file);
        await new Promise(resolve => file.on('finish', resolve));
      }
    },
  },
};
