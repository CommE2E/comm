// @flow

import { registerDevMenuItems } from 'expo-dev-menu';
import { Alert } from 'react-native';

import { getMessageForException } from 'lib/utils/errors.js';

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
          Alert.alert('Media cache cleared');
        } catch (e) {
          Alert.alert('Cache clear failed', getMessageForException(e));
        }
      },
    },
  ];

  registerDevMenuItems(devMenuItems);
}
