// @flow

import { registerDevMenuItems } from 'expo-dev-menu';

import { filesystemMediaCache } from './media/media-cache.js';

// see https://docs.expo.dev/develop/development-builds/development-workflows/#extending-the-dev-menu
// for details on extending the dev menu
if (__DEV__) {
  const devMenuItems = [
    {
      name: 'Clear media cache',
      callback: async () => {
        try {
          await filesystemMediaCache.clearCache();
          alert('Media cache cleared');
        } catch {
          alert('Cache clear failed');
        }
      },
    },
  ];

  registerDevMenuItems(devMenuItems);
}
