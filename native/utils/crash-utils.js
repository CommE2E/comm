// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';

import sleep from 'lib/utils/sleep.js';

import { featureFlagsStorageKey } from '../components/feature-flags-provider.react.js';
import { clearSensitiveData } from '../data/sqlite-data-handler.js';
import { commCoreModule } from '../native-modules.js';
import { navStateAsyncStorageKey } from '../navigation/persistance.js';
import { getPersistor } from '../redux/persist.js';

async function wipeAndExit() {
  await Promise.all([
    __DEV__ ? AsyncStorage.removeItem(navStateAsyncStorageKey) : null,
    AsyncStorage.removeItem('ANDROID_REFERRER'),
    AsyncStorage.removeItem(featureFlagsStorageKey),
    clearSensitiveData(),
  ]);
  await getPersistor().purge();
  await sleep(50);
  commCoreModule.terminate();
}

export { wipeAndExit };
