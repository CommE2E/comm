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

// After register or login is successful
function markKeysAsPublished(account: OlmAccount) {
  account.mark_prekey_as_published();
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
  const userInfoPromise = getUserCredentials();

  const result = await fetchIdentityInfo();

  if (result) {
    return result;
  }

  const userInfo = await userInfoPromise;

  const identityInfo = await registerOrLogIn(userInfo);
  await saveIdentityInfo(identityInfo);
  return identityInfo;
}

async function registerOrLogIn(
  userInfo: UserCredentials,
): Promise<IdentityInfo> {
  const rustAPIPromise = getRustAPI();

  const {
    identityKeys: notificationsIdentityKeys,
    prekey: notificationsPrekey,
    prekeySignature: notificationsPrekeySignature,
    oneTimeKeys: notificationsOneTimeKeys,
  } = await fetchCallUpdateOlmAccount('notifications', retrieveAccountKeysSet);

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
    fetchCallUpdateOlmAccount('content', contentAccountCallback),
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
    );
    await Promise.all([
      fetchCallUpdateOlmAccount('content', markKeysAsPublished),
      fetchCallUpdateOlmAccount('notifications', markKeysAsPublished),
    ]);
    return identity_info;
  } catch (e) {
    console.warn('Failed to login user: ' + getMessageForException(e));
    try {
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
        fetchCallUpdateOlmAccount('content', markKeysAsPublished),
        fetchCallUpdateOlmAccount('notifications', markKeysAsPublished),
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

export { verifyUserLoggedIn };
