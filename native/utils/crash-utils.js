// @flow

import ExitApp from 'react-native-exit-app';
import AsyncStorage from '@react-native-community/async-storage';

import sleep from 'lib/utils/sleep';

import { getPersistor } from '../redux/persist';
import { navStateAsyncStorageKey } from '../navigation/persistance';

async function wipeAndExit() {
  await Promise.all([
    getPersistor().purge(),
    __DEV__ ? AsyncStorage.removeItem(navStateAsyncStorageKey) : null,
  ]);
  await sleep(50);
  ExitApp.exitApp();
}

export { wipeAndExit };
