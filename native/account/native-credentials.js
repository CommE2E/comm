// @flow

import {
  getInternetCredentials,
  setInternetCredentials,
  resetInternetCredentials,
} from 'react-native-keychain';

export type UserCredentials = {
  +username: string,
  +password: string,
};

type StoredCredentials = {
  state: 'undetermined' | 'determined' | 'unsupported',
  credentials: ?UserCredentials,
};
let storedNativeKeychainCredentials: StoredCredentials = {
  state: 'undetermined',
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

function setNativeCredentials(credentials: UserCredentials): Promise<void> {
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

function deleteNativeCredentialsFor(): Promise<void> {
  return deleteNativeKeychainCredentials();
}

export {
  fetchNativeKeychainCredentials,
  fetchNativeCredentials,
  setNativeCredentials,
  deleteNativeCredentialsFor,
};
