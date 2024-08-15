// @flow

import type { Account as OlmAccount } from '@commapp/olm';

import { type RecreateNotifsOlmSessionRequest } from 'lib/types/keyserver-types.js';
import type {
  OlmSessionInitializationInfo,
  GetOlmSessionInitializationDataResponse,
} from 'lib/types/request-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { createAndPersistOlmSession } from '../creators/olm-session-creator.js';
import type { Viewer } from '../session/viewer.js';
import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';

type SessionInitializationKeysSet = {
  +identityKeys: string,
  ...OlmSessionInitializationInfo,
};

function retrieveSessionInitializationKeysSet(
  account: OlmAccount,
): SessionInitializationKeysSet {
  const identityKeys = account.identity_keys();

  const prekey = account.prekey();
  const prekeySignature = account.prekey_signature();

  if (!prekeySignature) {
    throw new ServerError('invalid_prekey');
  }

  account.generate_one_time_keys(1);
  const oneTimeKey = account.one_time_keys();
  account.mark_keys_as_published();

  return { identityKeys, oneTimeKey, prekey, prekeySignature };
}

async function getOlmSessionInitializationDataResponder(): Promise<GetOlmSessionInitializationDataResponse> {
  const {
    identityKeys: notificationsIdentityKeys,
    prekey: notificationsPrekey,
    prekeySignature: notificationsPrekeySignature,
    oneTimeKey: notificationsOneTimeKey,
  } = await fetchCallUpdateOlmAccount(
    'notifications',
    retrieveSessionInitializationKeysSet,
  );

  const contentAccountCallback = async (account: OlmAccount) => {
    const {
      identityKeys: contentIdentityKeys,
      oneTimeKey,
      prekey,
      prekeySignature,
    } = await retrieveSessionInitializationKeysSet(account);

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

  const notifInitializationInfo = {
    prekey: notificationsPrekey,
    prekeySignature: notificationsPrekeySignature,
    oneTimeKey: notificationsOneTimeKey,
  };
  const contentInitializationInfo = {
    prekey: contentPrekey,
    prekeySignature: contentPrekeySignature,
    oneTimeKey: contentOneTimeKey,
  };

  return {
    signedIdentityKeysBlob,
    contentInitializationInfo,
    notifInitializationInfo,
  };
}

async function recreateNotifsOlmSessionResponder(
  viewer: Viewer,
  request: RecreateNotifsOlmSessionRequest,
): Promise<void> {
  const {
    initialEncryptedMessage,
    identityKeysBlob: {
      notificationIdentityPublicKeys: { curve25519 },
    },
  } = request;
  await createAndPersistOlmSession(
    initialEncryptedMessage,
    'notifications',
    viewer.cookieID,
    curve25519,
  );
}

export {
  getOlmSessionInitializationDataResponder,
  recreateNotifsOlmSessionResponder,
};
