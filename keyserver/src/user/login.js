// @flow

import type { Account as OlmAccount } from '@commapp/olm';
import type { QueryResults } from 'mysql';
import { getRustAPI } from 'rust-node-addon';

import type { OLMOneTimeKeys } from 'lib/types/crypto-types';
import { getCommConfig } from 'lib/utils/comm-config.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';

import { SQL, dbQuery } from '../database/database.js';
import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';
import { validateAccountPrekey } from '../utils/olm-utils.js';

type UserCredentials = { +username: string, +password: string };
type IdentityInfo = { +userId: string, +accessToken: string };

const userIDMetadataKey = 'user_id';
const accessTokenMetadataKey = 'access_token';

export type AccountKeysSet = {
  +identityKeys: string,
  +prekey: string,
  +prekeySignature: string,
  +oneTimeKey: $ReadOnlyArray<string>,
};

function getOneTimeKeyValues(keyBlob: string): $ReadOnlyArray<string> {
  const content: OLMOneTimeKeys = JSON.parse(keyBlob);
  const keys: $ReadOnlyArray<string> = values(content.curve25519);
  return keys;
}

function retrieveAccountKeysSet(account: OlmAccount): AccountKeysSet {
  const identityKeys = account.identity_keys();

  validateAccountPrekey(account);
  const prekeyMap = JSON.parse(account.prekey()).curve25519;
  const [prekey] = values(prekeyMap);
  const prekeySignature = account.prekey_signature();

  if (!prekeySignature || !prekey) {
    throw new ServerError('Invalid prekey or signature');
  }

  if (getOneTimeKeyValues(account.one_time_keys()).length < 10) {
    account.generate_one_time_keys(10);
  }

  const oneTimeKey = getOneTimeKeyValues(account.one_time_keys());

  return { identityKeys, oneTimeKey, prekey, prekeySignature };
}

// After register or login is successful
function markKeysAsPublished(account: OlmAccount) {
  account.mark_prekey_as_published();
  account.mark_keys_as_published();
}

async function fetchIdentityInfo(): Promise<?IdentityInfo> {
  const versionQuery = SQL`
    SELECT data
    FROM metadata
    WHERE name IN (${userIDMetadataKey}, ${accessTokenMetadataKey});
  `;

  const [[userId, accessToken]] = await dbQuery(versionQuery);
  if (!userId || !accessToken) {
    return null;
  }
  return { userId, accessToken };
}

async function saveIdentityInfo(userInfo: IdentityInfo): Promise<QueryResults> {
  const updateQuery = SQL`
    REPLACE INTO metadata (name, data)
    VALUES (${userIDMetadataKey}, ${userInfo.userId}),
      (${accessTokenMetadataKey}, ${userInfo.accessToken})
  `;

  return dbQuery(updateQuery);
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
    throw new ServerError('Missing user credentials');
  }

  const {
    identityKeys: notificationsIdentityKeys,
    prekey: notificationsPrekey,
    prekeySignature: notificationsPrekeySignature,
    oneTimeKey: notificationsOneTimeKey,
  } = await fetchCallUpdateOlmAccount('notifications', retrieveAccountKeysSet);

  const contentAccountCallback = async (account: OlmAccount) => {
    const {
      identityKeys: contentIdentityKeys,
      oneTimeKey,
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
      oneTimeKey,
      prekey,
      prekeySignature,
    };
  };

  const {
    signedIdentityKeysBlob,
    prekey: contentPrekey,
    prekeySignature: contentPrekeySignature,
    oneTimeKey: contentOneTimeKey,
  } = await fetchCallUpdateOlmAccount('content', contentAccountCallback);

  const rustAPI = await rustAPIPromise;

  try {
    const identity_info = await rustAPI.loginUser(
      userInfo.username,
      userInfo.password,
      signedIdentityKeysBlob,
      contentPrekey,
      contentPrekeySignature,
      notificationsPrekey,
      notificationsPrekeySignature,
      contentOneTimeKey,
      notificationsOneTimeKey,
    );
    await Promise.all([
      fetchCallUpdateOlmAccount('content', markKeysAsPublished),
      fetchCallUpdateOlmAccount('notifications', markKeysAsPublished),
    ]);
    return identity_info;
  } catch (e) {
    console.log('Failed to log into identity service: ' + e);
    try {
      const identity_info = await rustAPI.registerUser(
        userInfo.username,
        userInfo.password,
        signedIdentityKeysBlob,
        contentPrekey,
        contentPrekeySignature,
        notificationsPrekey,
        notificationsPrekeySignature,
        contentOneTimeKey,
        notificationsOneTimeKey,
      );
      await Promise.all([
        fetchCallUpdateOlmAccount('content', markKeysAsPublished),
        fetchCallUpdateOlmAccount('notifications', markKeysAsPublished),
      ]);
      console.log('Finished registration');
      return identity_info;
    } catch (err) {
      console.log('Failed to register user: ' + err);
      throw new Error('Unable to login or register user');
    }
  }
}

export { verifyUserLoggedIn };
