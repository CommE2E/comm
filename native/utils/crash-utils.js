// @flow

import AsyncStorage from '@react-native-community/async-storage';
import sleep from 'lib/utils/sleep';
import ExitApp from 'react-native-exit-app';

import { navStateAsyncStorageKey } from '../navigation/persistance';
import { getPersistor } from '../redux/persist';

async function wipeAndExit() {
  await Promise.all([
    getPersistor().purge(),
    __DEV__ ? AsyncStorage.removeItem(navStateAsyncStorageKey) : null,
  ]);
  await sleep(50);
  ExitApp.exitApp();
}

export { wipeAndExit };
