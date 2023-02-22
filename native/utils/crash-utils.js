// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';

import sleep from 'lib/utils/sleep.js';

import { commCoreModule } from '../native-modules.js';
import { navStateAsyncStorageKey } from '../navigation/persistance.js';
import { getPersistor } from '../redux/persist.js';

async function wipeAndExit() {
  await Promise.all([
    getPersistor().purge(),
    __DEV__ ? AsyncStorage.removeItem(navStateAsyncStorageKey) : null,
  ]);
  await sleep(50);
  commCoreModule.terminate();
}

export { wipeAndExit };
