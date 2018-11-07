// @flow

import { Platform } from 'react-native';
import {
  getInternetCredentials,
  requestSharedWebCredentials,
  setInternetCredentials,
  setSharedWebCredentials,
  resetInternetCredentials,
} from 'react-native-keychain';
import URL from 'url-parse';

type Credentials = {|
  username: string,
  password: string,
|};
type StoredCredentials = {|
  state: "undetermined" | "determined" | "unsupported",
  credentials: ?Credentials,
|};
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

function getNativeSharedWebCredentials(): ?Credentials {
  if (Platform.OS !== "ios") {
    return null;
  }
  if (storedSharedWebCredentials.state !== "determined") {
    return null;
  }
  return storedSharedWebCredentials.credentials;
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
      "squadcal.org",
      credentials.username,
      credentials.password,
    );
    storedSharedWebCredentials = { state: "determined", credentials };
  } catch (e) {
    storedSharedWebCredentials = { state: "unsupported", credentials: null };
  }
}

async function setNativeCredentials(credentials: $Shape<Credentials>) {
  if (!credentials.username || !credentials.password) {
    const currentCredentials = await fetchNativeCredentials();
    if (currentCredentials) {
      credentials = {
        username: credentials.username
          ? credentials.username
          : currentCredentials.username,
        password: credentials.password
          ? credentials.password
          : currentCredentials.password,
      };
    }
  }
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
  fetchNativeKeychainCredentials,
  fetchNativeCredentials,
  getNativeSharedWebCredentials,
  setNativeCredentials,
  deleteNativeCredentialsFor,
};
