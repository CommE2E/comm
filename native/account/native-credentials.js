// @flow

import { Platform } from 'react-native';
import {
  getInternetCredentials,
  requestSharedWebCredentials,
  setInternetCredentials,
  setSharedWebCredentials,
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
let storedSharedWebCredentials: StoredCredentials = {
  state: Platform.OS === 'ios' ? 'undetermined' : 'unsupported',
  credentials: null,
};

async function fetchNativeKeychainCredentials(): Promise<?UserCredentials> {
  if (storedNativeKeychainCredentials.state === 'determined') {
    return storedNativeKeychainCredentials.credentials;
  }
  try {
    const result = await getInternetCredentials('squadcal.org');
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

async function fetchNativeSharedWebCredentials(): Promise<?UserCredentials> {
  if (Platform.OS !== 'ios') {
    return null;
  }
  if (storedSharedWebCredentials.state === 'determined') {
    return storedSharedWebCredentials.credentials;
  }
  try {
    const result = await requestSharedWebCredentials();
    const credentials = result
      ? { username: result.username, password: result.password }
      : undefined;
    storedSharedWebCredentials = { state: 'determined', credentials };
    return credentials;
  } catch (e) {
    const credentials = null;
    storedSharedWebCredentials = { state: 'unsupported', credentials };
    return credentials;
  }
}

async function fetchNativeCredentials(): Promise<?UserCredentials> {
  const keychainCredentials = await fetchNativeKeychainCredentials();
  if (keychainCredentials) {
    return keychainCredentials;
  }
  return await fetchNativeSharedWebCredentials();
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
      'squadcal.org',
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

async function setNativeSharedWebCredentials(credentials: UserCredentials) {
  if (Platform.OS !== 'ios') {
    return;
  }
  const currentKeychainCredentials = await fetchNativeKeychainCredentials();
  // If the password entered is the same as what we've got in the native
  // keychain, then assume that nothing has been changed. We exit early here
  // because if there are already shared web credentials, the
  // setSharedWebCredentials call below will pop up an alert regardless of
  // whether the credentials we pass it are the same as what it already has.
  if (
    currentKeychainCredentials &&
    credentials.username === currentKeychainCredentials.username &&
    credentials.password === currentKeychainCredentials.password
  ) {
    return;
  }
  // You might think we should just check fetchNativeSharedWebCredentials to
  // see if the new shared web credentials we are about to pass to
  // setSharedWebCredentials are the same as what it already has. But it turns
  // out that that will trigger an alert too, which isn't worth it because we're
  // only checking it to prevent an unnecessary alert. The smart thing we can do
  // is check our internal cache.
  const cachedSharedWebCredentials = getNativeSharedWebCredentials();
  if (
    cachedSharedWebCredentials &&
    credentials.username === cachedSharedWebCredentials.username &&
    credentials.password === cachedSharedWebCredentials.password
  ) {
    return;
  }
  try {
    await setSharedWebCredentials(
      'squadcal.org',
      credentials.username,
      credentials.password,
    );
    storedSharedWebCredentials = { state: 'determined', credentials };
  } catch (e) {
    storedSharedWebCredentials = { state: 'unsupported', credentials: null };
  }
}

function setNativeCredentials(credentials: UserCredentials) {
  return Promise.all([
    setNativeKeychainCredentials(credentials),
    setNativeSharedWebCredentials(credentials),
  ]);
}

async function deleteNativeKeychainCredentials() {
  try {
    await resetInternetCredentials('squadcal.org');
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

async function deleteNativeSharedWebCredentialsFor(username: string) {
  if (Platform.OS !== 'ios') {
    return;
  }
  try {
    // This native call will display a modal iff credentials are non-null,
    // so we don't need to worry about checking our current state
    await setSharedWebCredentials('squadcal.org', username, undefined);
    storedSharedWebCredentials = {
      state: 'determined',
      credentials: undefined,
    };
  } catch (e) {
    storedSharedWebCredentials = {
      state: 'unsupported',
      credentials: null,
    };
  }
}

async function deleteNativeCredentialsFor(username: string) {
  await Promise.all([
    deleteNativeKeychainCredentials(),
    deleteNativeSharedWebCredentialsFor(username),
  ]);
}

export {
  fetchNativeKeychainCredentials,
  fetchNativeCredentials,
  getNativeSharedWebCredentials,
  setNativeCredentials,
  deleteNativeCredentialsFor,
};
