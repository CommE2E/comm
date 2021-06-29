// @flow

import { Platform } from 'react-native';
import {
  getInternetCredentials,
  setInternetCredentials,
  resetInternetCredentials,
} from 'react-native-keychain';

type UserCredentials = {|
  +username: string,
  +password: string,
|};

type StoredCredentials = {|
  state: 'undetermined' | 'determined' | 'unsupported',
  credentials: ?UserCredentials,
|};
let storedNativeKeychainCredentials: StoredCredentials = {
  state: 'undetermined',
  credentials: null,
};
const storedSharedWebCredentials: StoredCredentials = {
  state: Platform.OS === 'ios' ? 'undetermined' : 'unsupported',
  credentials: null,
};

async function fetchNativeKeychainCredentials(): Promise<?UserCredentials> {
  if (storedNativeKeychainCredentials.state === 'determined') {
    return storedNativeKeychainCredentials.credentials;
  }
  try {
    const result = await getInternetCredentials('comm.app');
    const credentials = result
      ? { username: result.username, password: result.password }
      : undefined;
    storedNativeKeychainCredentials = { state: 'determined', credentials };
    return credentials;
  } catch (e) {
    const credentials = null;
    storedNativeKeychainCredentials = { state: 'unsupported', credentials };
    return credentials;
  }
}

function getNativeSharedWebCredentials(): ?UserCredentials {
  if (Platform.OS !== 'ios') {
    return null;
  }
  if (storedSharedWebCredentials.state !== 'determined') {
    return null;
  }
  return storedSharedWebCredentials.credentials;
}

async function fetchNativeCredentials(): Promise<?UserCredentials> {
  const keychainCredentials = await fetchNativeKeychainCredentials();
  if (keychainCredentials) {
    return keychainCredentials;
  }
  return null;
}

async function setNativeKeychainCredentials(credentials: UserCredentials) {
  const current = await fetchNativeKeychainCredentials();
  if (
    current &&
    credentials.username === current.username &&
    credentials.password === current.password
  ) {
    return;
  }
  try {
    await setInternetCredentials(
      'comm.app',
      credentials.username,
      credentials.password,
    );
    storedNativeKeychainCredentials = { state: 'determined', credentials };
  } catch (e) {
    storedNativeKeychainCredentials = {
      state: 'unsupported',
      credentials: null,
    };
  }
}

function setNativeCredentials(credentials: UserCredentials) {
  return setNativeKeychainCredentials(credentials);
}

async function deleteNativeKeychainCredentials() {
  try {
    await resetInternetCredentials('comm.app');
    storedNativeKeychainCredentials = {
      state: 'determined',
      credentials: undefined,
    };
  } catch (e) {
    storedNativeKeychainCredentials = {
      state: 'unsupported',
      credentials: null,
    };
  }
}

// eslint-disable-next-line no-unused-vars
function deleteNativeCredentialsFor(username: string) {
  return deleteNativeKeychainCredentials();
}

export {
  fetchNativeKeychainCredentials,
  fetchNativeCredentials,
  getNativeSharedWebCredentials,
  setNativeCredentials,
  deleteNativeCredentialsFor,
};
