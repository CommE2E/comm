// @flow

import type { Account as OlmAccount } from '@commapp/olm';
import { getRustAPI } from 'rust-node-addon';

import { getCommConfig } from 'lib/utils/comm-config.js';
import { ServerError } from 'lib/utils/errors.js';
import { retrieveAccountKeysSet } from 'lib/utils/olm-utils.js';

import type { UserCredentials } from './checks.js';
import {
  saveIdentityInfo,
  fetchIdentityInfo,
  type IdentityInfo,
} from './identity.js';
import { getMessageForException } from '../responders/utils.js';
import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';
import { unpickleOlmAccount } from '../utils/olm-utils.js';
import type { PickledOlmAccount } from '../utils/olm-utils.js';

// After register or login is successful
function markPrekeyAsPublished(account: OlmAccount) {
  account.mark_prekey_as_published();
}

// Before registration
function markOneTimeKeysAsPublished(account: OlmAccount) {
  account.mark_keys_as_published();
}

async function getUserCredentials(): Promise<UserCredentials> {
  const userInfo = await getCommConfig<UserCredentials>({
    folder: 'secrets',
    name: 'user_credentials',
  });

  if (!userInfo) {
    throw new ServerError('missing_user_credentials');
  }

  if (
    userInfo.usingIdentityCredentials === undefined &&
    process.env.NODE_ENV === 'development'
  ) {
    console.warn(
      'Keyserver is not set up to use identity credentials' +
        '\nUsing identity credentials is optional for now' +
        '\nYou can restart nix to set up a new keyserver ' +
        'with identity credentials' +
        '\nFor keyservers running in Docker, refer to ' +
        'https://www.notion.so/commapp/Running-two-keyservers-4295f98e7b0547d4ba027ba52c2d2e80?pvs=4#1f4178200d2b442bb7fa05dca447f406',
    );
  }

  return userInfo;
}

async function verifyUserLoggedIn(): Promise<IdentityInfo> {
  const result = await fetchIdentityInfo();

  if (result) {
    return result;
  }

  const userInfo = await getUserCredentials();
  const identityInfo = await registerOrLogIn(userInfo);
  await saveIdentityInfo(identityInfo);
  return identityInfo;
}

async function unpickleAndUseCallback<T>(
  pickledOlmAccount: PickledOlmAccount,
  callback: (account: OlmAccount, picklingKey: string) => Promise<T> | T,
): Promise<{ result: T, pickledOlmAccount: PickledOlmAccount }> {
  const { picklingKey, pickledAccount } = pickledOlmAccount;

  const account = await unpickleOlmAccount({
    picklingKey,
    pickledAccount,
  });
  let result;
  try {
    result = await callback(account, picklingKey);
  } catch (e) {
    throw new ServerError(getMessageForException(e) ?? 'unknown_error');
  }
  const updatedAccount = account.pickle(picklingKey);

  return {
    result,
    pickledOlmAccount: { ...pickledOlmAccount, pickledAccount: updatedAccount },
  };
}

async function verifyUserLoggedInWithoutDB(
  pickledContentAccount: PickledOlmAccount,
  pickledNotificationsAccount: PickledOlmAccount,
): Promise<{
  identityInfo: IdentityInfo,
  pickledContentAccount: PickledOlmAccount,
  pickledNotificationsAccount: PickledOlmAccount,
}> {
  const userInfo = await getUserCredentials();

  const identityInfo = await registerOrLogInBase(
    userInfo,
    async callback => {
      const { result, pickledOlmAccount } = await unpickleAndUseCallback(
        pickledContentAccount,
        callback,
      );
      pickledContentAccount = pickledOlmAccount;
      return result;
    },
    async callback => {
      const { result, pickledOlmAccount } = await unpickleAndUseCallback(
        pickledNotificationsAccount,
        callback,
      );
      pickledNotificationsAccount = pickledOlmAccount;
      return result;
    },
  );
  return { identityInfo, pickledContentAccount, pickledNotificationsAccount };
}

async function registerOrLogIn(
  userInfo: UserCredentials,
): Promise<IdentityInfo> {
  return registerOrLogInBase(
    userInfo,
    callback => fetchCallUpdateOlmAccount('content', callback),
    callback => fetchCallUpdateOlmAccount('notifications', callback),
  );
}

async function registerOrLogInBase<T>(
  userInfo: UserCredentials,
  getUpdateContentAccount: <T>(
    callback: (account: OlmAccount, picklingKey: string) => Promise<T> | T,
  ) => Promise<T>,
  getUpdateNotificationsAccount: <T>(
    callback: (account: OlmAccount, picklingKey: string) => Promise<T> | T,
  ) => Promise<T>,
): Promise<IdentityInfo> {
  const rustAPIPromise = getRustAPI();

  const {
    identityKeys: notificationsIdentityKeys,
    prekey: notificationsPrekey,
    prekeySignature: notificationsPrekeySignature,
    oneTimeKeys: notificationsOneTimeKeys,
  } = await getUpdateNotificationsAccount(retrieveAccountKeysSet);

  const contentAccountCallback = async (account: OlmAccount) => {
    const {
      identityKeys: contentIdentityKeys,
      oneTimeKeys,
      prekey,
      prekeySignature,
    } = await retrieveAccountKeysSet(account);

    const identityKeysBlob = {
      primaryIdentityPublicKeys: JSON.parse(contentIdentityKeys),
      notificationIdentityPublicKeys: JSON.parse(notificationsIdentityKeys),
    };
    const identityKeysBlobPayload = JSON.stringify(identityKeysBlob);
    const signedIdentityKeysBlob = {
      payload: identityKeysBlobPayload,
      signature: account.sign(identityKeysBlobPayload),
    };

    return {
      signedIdentityKeysBlob,
      oneTimeKeys,
      prekey,
      prekeySignature,
    };
  };

  const [
    rustAPI,
    {
      signedIdentityKeysBlob,
      prekey: contentPrekey,
      prekeySignature: contentPrekeySignature,
      oneTimeKeys: contentOneTimeKeys,
    },
  ] = await Promise.all([
    rustAPIPromise,
    getUpdateContentAccount(contentAccountCallback),
  ]);

  try {
    const identity_info = await rustAPI.loginUser(
      userInfo.username,
      userInfo.password,
      signedIdentityKeysBlob,
      contentPrekey,
      contentPrekeySignature,
      notificationsPrekey,
      notificationsPrekeySignature,
      contentOneTimeKeys,
      notificationsOneTimeKeys,
      userInfo.forceLogin,
    );
    await Promise.all([
      getUpdateContentAccount(markPrekeyAsPublished),
      getUpdateNotificationsAccount(markPrekeyAsPublished),
    ]);
    return identity_info;
  } catch (e) {
    console.warn('Failed to login user: ' + getMessageForException(e));
    try {
      await Promise.all([
        getUpdateContentAccount(markOneTimeKeysAsPublished),
        getUpdateNotificationsAccount(markOneTimeKeysAsPublished),
      ]);
      const identity_info = await rustAPI.registerUser(
        userInfo.username,
        userInfo.password,
        signedIdentityKeysBlob,
        contentPrekey,
        contentPrekeySignature,
        notificationsPrekey,
        notificationsPrekeySignature,
        contentOneTimeKeys,
        notificationsOneTimeKeys,
      );
      await Promise.all([
        getUpdateContentAccount(markPrekeyAsPublished),
        getUpdateNotificationsAccount(markPrekeyAsPublished),
      ]);
      return identity_info;
    } catch (err) {
      console.warn('Failed to register user: ' + getMessageForException(err));
      if (userInfo.usingIdentityCredentials) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            'Please re-enter `nix develop` and provide new user credentials',
          );
        } else {
          console.warn(
            'For keyservers running in Docker, set different ' +
              'user credentials in COMM_JSONCONFIG_secrets_user_credentials, ' +
              'remove all tables from the database, and restart.' +
              '\nFor keyservers outside of Docker, re-enter `nix develop` ' +
              'and provide new user credentials',
          );
        }
      }
      throw new ServerError('identity_auth_failed');
    }
  }
}

export { verifyUserLoggedIn, verifyUserLoggedInWithoutDB };
