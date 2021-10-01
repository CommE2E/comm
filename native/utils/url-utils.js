// @flow

import invariant from 'invariant';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import { natDevHostname, checkForMissingNatDevHostname } from './dev-hostname';

const localhostHostname = 'localhost';
const localhostHostnameFromAndroidEmulator = '10.0.2.2';

const productionNodeServerURL = 'https://squadcal.org';

function getDevServerHostname(isEmulator: boolean): string {
  invariant(__DEV__, 'getDevServerHostname called from production');
  if (!isEmulator) {
    checkForMissingNatDevHostname();
    return natDevHostname;
  } else if (Platform.OS === 'android') {
    return localhostHostnameFromAndroidEmulator;
  } else if (Platform.OS === 'ios') {
    return localhostHostname;
  }
  invariant(false, `unsupported platform: ${Platform.OS}`);
}

function getDevNodeServerURLFromHostname(hostname: string): string {
  return `http://${hostname}/comm`;
}

function getDevNodeServerURL(isEmulator: boolean): string {
  invariant(__DEV__, 'getDevNodeServerURL called from production');
  const hostname = getDevServerHostname(isEmulator);
  return getDevNodeServerURLFromHostname(hostname);
}

async function fetchDevServerHostname(): Promise<string> {
  invariant(__DEV__, 'fetchDevServerHostname called from production');
  const isEmulator = await DeviceInfo.isEmulator();
  return getDevServerHostname(isEmulator);
}

function fetchDevServerHostnameSync(): string {
  invariant(__DEV__, 'fetchDevServerHostnameSync called from production');
  const isEmulator = DeviceInfo.isEmulatorSync();
  return getDevServerHostname(isEmulator);
}

const nodeServerOptions = [productionNodeServerURL];
if (Platform.OS === 'android') {
  nodeServerOptions.push(
    getDevNodeServerURLFromHostname(localhostHostnameFromAndroidEmulator),
  );
} else {
  nodeServerOptions.push(getDevNodeServerURLFromHostname(localhostHostname));
}

const defaultURLPrefix: string = __DEV__
  ? getDevNodeServerURL(DeviceInfo.isEmulatorSync())
  : productionNodeServerURL;

const natNodeServer: string = getDevNodeServerURLFromHostname(natDevHostname);

const setCustomServer = 'SET_CUSTOM_SERVER';

export {
  defaultURLPrefix,
  fetchDevServerHostname,
  fetchDevServerHostnameSync,
  nodeServerOptions,
  natNodeServer,
  setCustomServer,
};
