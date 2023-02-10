// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';
import ExitApp from 'react-native-exit-app';

import sleep from 'lib/utils/sleep.js';

import { navStateAsyncStorageKey } from '../navigation/persistance.js';
import { getPersistor } from '../redux/persist.js';

async function wipeAndExit() {
  await Promise.all([
    getPersistor().purge(),
    __DEV__ ? AsyncStorage.removeItem(navStateAsyncStorageKey) : null,
  ]);
  await sleep(50);
  ExitApp.exitApp();
}

export { wipeAndExit };
