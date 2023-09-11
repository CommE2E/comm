// @flow

import type { Account as OlmAccount } from '@commapp/olm';
import { getRustAPI } from 'rust-node-addon';

import { getOneTimeKeyValuesFromBlob } from 'lib/shared/crypto-utils.js';
import { getCommConfig } from 'lib/utils/comm-config.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';

import {
  saveIdentityInfo,
  fetchIdentityInfo,
  type IdentityInfo,
} from './identity.js';
import { getMessageForException } from '../responders/utils.js';
import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';
import { validateAccountPrekey } from '../utils/olm-utils.js';

type UserCredentials = { +username: string, +password: string };

export type AccountKeysSet = {
  +identityKeys: string,
  +prekey: string,
  +prekeySignature: string,
  +oneTimeKeys: $ReadOnlyArray<string>,
};

function retrieveAccountKeysSet(account: OlmAccount): AccountKeysSet {
  const identityKeys = account.identity_keys();

  validateAccountPrekey(account);
  const prekeyMap = JSON.parse(account.prekey()).curve25519;
  const [prekey] = values(prekeyMap);
  const prekeySignature = account.prekey_signature();

  if (!prekeySignature || !prekey) {
    throw new ServerError('invalid_prekey');
  }

  let oneTimeKeys = getOneTimeKeyValuesFromBlob(account.one_time_keys());

  if (oneTimeKeys.length < 10) {
    account.generate_one_time_keys(10);
    oneTimeKeys = getOneTimeKeyValuesFromBlob(account.one_time_keys());
  }

  return { identityKeys, oneTimeKeys, prekey, prekeySignature };
}

// After register or login is successful
function markKeysAsPublished(account: OlmAccount) {
  account.mark_prekey_as_published();
  account.mark_keys_as_published();
}

async function verifyUserLoggedIn(): Promise<IdentityInfo> {
  const result = await fetchIdentityInfo();

  if (result) {
    return result;
  }

  const identityInfo = await registerOrLogin();
  await saveIdentityInfo(identityInfo);
  return identityInfo;
}

async function registerOrLogin(): Promise<IdentityInfo> {
  const rustAPIPromise = getRustAPI();

  const userInfo = await getCommConfig<UserCredentials>({
    folder: 'secrets',
    name: 'user_credentials',
  });

  if (!userInfo) {
    throw new ServerError('missing_user_credentials');
  }

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
      throw new ServerError('identity_auth_failed');
    }
  }
}

export { verifyUserLoggedIn };
