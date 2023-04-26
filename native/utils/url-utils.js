// @flow

import invariant from 'invariant';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import urlParseLax from 'url-parse-lax';

import {
  natDevHostname,
  checkForMissingNatDevHostname,
} from './dev-hostname.js';

const localhostHostname = 'localhost';
const localhostHostnameFromAndroidEmulator = '10.0.2.2';

const productionNodeServerURL = 'https://squadcal.org';
const productionLandingURL = 'https://comm.app';
const devIsEmulator: boolean = __DEV__ && DeviceInfo.isEmulatorSync();

// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
function getDevServerHostname(): string {
  if (!devIsEmulator) {
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
  return `http://${hostname}:3000/comm`;
}

function getDevLandingURLFromHostname(hostname: string): string {
  return `http://${hostname}:3000/commlanding`;
}

function getDevNodeServerURL(): string {
  const hostname = getDevServerHostname();
  return getDevNodeServerURLFromHostname(hostname);
}

function getDevLandingURL(): string {
  const hostname = getDevServerHostname();
  return getDevLandingURLFromHostname(hostname);
}

const nodeServerOptions: string[] = [
  productionNodeServerURL,
  getDevNodeServerURL(),
];

const defaultURLPrefix: string = __DEV__
  ? getDevNodeServerURL()
  : productionNodeServerURL;

const defaultLandingURLPrefix: string = __DEV__
  ? getDevLandingURL()
  : productionLandingURL;

const natNodeServer: string = getDevNodeServerURLFromHostname(natDevHostname);

const setCustomServer = 'SET_CUSTOM_SERVER';

function normalizeURL(url: string): string {
  return urlParseLax(url).href;
}

export {
  defaultURLPrefix,
  defaultLandingURLPrefix,
  getDevServerHostname,
  nodeServerOptions,
  natNodeServer,
  setCustomServer,
  normalizeURL,
};
