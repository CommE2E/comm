// @flow

import invariant from 'invariant';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import networkSettings from '../facts/network';

const localhostHostname = 'localhost';
const localhostHostnameFromAndroidEmulator = '10.0.2.2';
const { natDevHostname } = networkSettings;

const productionNodeServerURL = 'https://squadcal.org';

function getDevServerHostname(isEmulator: boolean): string {
  invariant(__DEV__, 'getDevServerHostname called from production');
  if (!isEmulator) {
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

async function fetchNodeServerURL(): Promise<string> {
  if (!__DEV__) {
    return productionNodeServerURL;
  }
  const isEmulator = await DeviceInfo.isEmulator();
  return getDevNodeServerURL(isEmulator);
}

function defaultURLPrefix(): string {
  if (!__DEV__) {
    return productionNodeServerURL;
  }
  return getDevNodeServerURL(true);
}

async function fetchDevServerHostname(): Promise<string> {
  invariant(__DEV__, 'fetchDevServerHostname called from production');
  const isEmulator = await DeviceInfo.isEmulator();
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

const natNodeServer = getDevNodeServerURLFromHostname(natDevHostname);

const setCustomServer = 'SET_CUSTOM_SERVER';

export {
  fetchNodeServerURL,
  defaultURLPrefix,
  fetchDevServerHostname,
  nodeServerOptions,
  natNodeServer,
  setCustomServer,
};
