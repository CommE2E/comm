// @flow

import { Platform } from 'react-native';
import {
  getInternetCredentials,
  requestSharedWebCredentials,
  setInternetCredentials,
  setSharedWebCredentials,
  resetInternetCredentials,
} from 'react-native-keychain';

type Credentials = {
  username: string,
  password: string,
};
type StoredCredentials = {
  state: "undetermined" | "determined" | "unsupported",
  credentials: ?Credentials,
};
let storedNativeKeychainCredentials = {
  state: "undetermined",
  credentials: null,
};
let storedSharedWebCredentials = {
  state: Platform.OS === "ios" ? "undetermined" : "unsupported",
  credentials: null,
};

async function fetchNativeKeychainCredentials(): Promise<?Credentials> {
  if (storedNativeKeychainCredentials.state === "determined") {
    return storedNativeKeychainCredentials.credentials;
  }
  try {
    let credentials = await getInternetCredentials("squadcal.org");
    credentials = credentials ? credentials : undefined;
    storedNativeKeychainCredentials = { state: "determined", credentials };
    return credentials;
  } catch (e) {
    const credentials = null;
    storedNativeKeychainCredentials = { state: "unsupported", credentials };
    return credentials;
  }
}

async function fetchNativeSharedWebCredentials(): Promise<?Credentials> {
  if (Platform.OS !== "ios") {
    return null;
  }
  if (storedSharedWebCredentials.state === "determined") {
    return storedSharedWebCredentials.credentials;
  }
  try {
    let credentials = await requestSharedWebCredentials("squadcal.org");
    credentials = credentials ? credentials : undefined;
    storedSharedWebCredentials = { state: "determined", credentials };
    return credentials;
  } catch (e) {
    const credentials = null;
    storedSharedWebCredentials = { state: "unsupported", credentials };
    return credentials;
  }
}

async function fetchNativeCredentials(): Promise<?Credentials> {
  const keychainCredentials = await fetchNativeKeychainCredentials();
  if (keychainCredentials) {
    return keychainCredentials;
  }
  return await fetchNativeSharedWebCredentials();
}

async function setNativeKeychainCredentials(credentials: Credentials) {
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
      "squadcal.org",
      credentials.username,
      credentials.password,
    );
    storedNativeKeychainCredentials = { state: "determined", credentials };
  } catch (e) {
    storedNativeKeychainCredentials = {
      state: "unsupported",
      credentials: null,
    };
  }
}

async function setNativeSharedWebCredentials(credentials: Credentials) {
  if (Platform.OS !== "ios") {
    return;
  }
  const current = await fetchNativeSharedWebCredentials();
  if (
    current &&
      credentials.username === current.username &&
      credentials.password === current.password
  ) {
    return;
  }
  try {
    await setSharedWebCredentials(
      "squadcal.org",
      credentials.username,
      credentials.password,
    );
    storedSharedWebCredentials = { state: "determined", credentials };
  } catch (e) {
    storedSharedWebCredentials = { state: "unsupported", credentials: null };
  }
}

async function setNativeCredentials(credentials: Credentials) {
  await Promise.all([
    setNativeKeychainCredentials(credentials),
    setNativeSharedWebCredentials(credentials),
  ]);
}

async function deleteNativeKeychainCredentials() {
  try {
    await resetInternetCredentials("squadcal.org");
    storedNativeKeychainCredentials = {
      state: "determined",
      credentials: undefined,
    };
  } catch(e) {
    storedNativeKeychainCredentials = {
      state: "unsupported",
      credentials: null,
    };
  }
}

async function deleteNativeSharedWebCredentialsFor(username: string) {
  if (Platform.OS !== "ios") {
    return;
  }
  try {
    // This native call will display a modal iff credentials are non-null,
    // so we don't need to worry about checking our current state
    await setSharedWebCredentials("squadcal.org", username, null);
    storedSharedWebCredentials = {
      state: "determined",
      credentials: undefined,
    };
  } catch(e) {
    storedSharedWebCredentials = {
      state: "unsupported",
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
  fetchNativeCredentials,
  fetchNativeSharedWebCredentials,
  setNativeCredentials,
  deleteNativeCredentialsFor,
};
