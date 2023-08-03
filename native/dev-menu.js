// @flow

import { registerDevMenuItems } from 'expo-dev-menu';

import { getMessageForException } from 'lib/utils/errors.js';

import { filesystemMediaCache } from './media/media-cache.js';
import Alert from './utils/alert.js';
import { wipeAndExit } from './utils/crash-utils.js';

// see https://docs.expo.dev/develop/development-builds/development-workflows/#extending-the-dev-menu
// for details on extending the dev menu
if (__DEV__) {
  const devMenuItems = [
    {
      name: 'Clear media cache',
      callback: async () => {
        try {
          await filesystemMediaCache.clearCache();
          Alert.alert('Media cache cleared');
        } catch (e) {
          Alert.alert('Cache clear failed', getMessageForException(e));
        }
      },
    },
    {
      name: 'Wipe state and kill app',
      callback: async () => {
        try {
          await wipeAndExit();
        } catch (e) {
          Alert.alert('Wipe failed', getMessageForException(e));
        }
      },
    },
  ];

  registerDevMenuItems(devMenuItems);
}
