// @flow

import type { Account as OlmAccount } from 'vodozemac';

import type {
  OlmSessionInitializationInfo,
  GetOlmSessionInitializationDataResponse,
} from 'lib/types/olm-session-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';

type SessionInitializationKeysSet = {
  +identityKeys: string,
  ...OlmSessionInitializationInfo,
};

function retrieveSessionInitializationKeysSet(
  account: OlmAccount,
): SessionInitializationKeysSet {
  const identityKeys = JSON.stringify({
    ed25519: account.ed25519_key,
    curve25519: account.curve25519_key,
  });

  const prekey = account.prekey();
  if (!prekey) {
    throw new ServerError('missing_prekey');
  }

  // Wrap prekey in old Olm format to match expected structure on all clients
  const prekeyWrapped = JSON.stringify({
    curve25519: { AAAAAA: prekey },
  });

  const prekeySignature = account.prekey_signature();
  if (!prekeySignature) {
    throw new ServerError('invalid_prekey');
  }

  account.generate_one_time_keys(1);
  const oneTimeKeysMap = account.one_time_keys();
  const oneTimeKeysEntries = Array.from(oneTimeKeysMap.entries());
  const oneTimeKeysObject = Object.fromEntries(oneTimeKeysEntries);
  const oneTimeKey = JSON.stringify({ curve25519: oneTimeKeysObject });
  account.mark_keys_as_published();

  return {
    identityKeys,
    oneTimeKey,
    prekey: prekeyWrapped,
    prekeySignature,
  };
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

export { getOlmSessionInitializationDataResponder };
