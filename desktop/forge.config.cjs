const fs = require('fs-extra');

// eslint-disable-next-line no-undef
module.exports = {
  packagerConfig: {
    name: 'Comm',
    icon: 'icons/icon',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
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
