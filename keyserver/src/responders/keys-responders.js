// @flow

import type { Account as OlmAccount } from '@commapp/olm';
import t, { type TUnion, type TInterface } from 'tcomb';

import type {
  OlmSessionInitializationInfo,
  GetOlmSessionInitializationDataResponse,
  GetSessionPublicKeysArgs,
} from 'lib/types/request-types.js';
import {
  type SessionPublicKeys,
  sessionPublicKeysValidator,
} from 'lib/types/session-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { tShape, tNull } from 'lib/utils/validation-utils.js';

import { fetchSessionPublicKeys } from '../fetchers/key-fetchers.js';
import { verifyClientSupported } from '../session/version.js';
import type { Viewer } from '../session/viewer.js';
import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';

type SessionInitializationKeysSet = {
  +identityKeys: string,
  ...OlmSessionInitializationInfo,
};

export const getSessionPublicKeysInputValidator: TInterface<GetSessionPublicKeysArgs> =
  tShape<GetSessionPublicKeysArgs>({
    session: t.String,
  });

type GetSessionPublicKeysResponse = SessionPublicKeys | null;
export const getSessionPublicKeysResponseValidator: TUnion<GetSessionPublicKeysResponse> =
  t.union([sessionPublicKeysValidator, tNull]);

async function getSessionPublicKeysResponder(
  viewer: Viewer,
  request: GetSessionPublicKeysArgs,
): Promise<GetSessionPublicKeysResponse> {
  if (!viewer.loggedIn) {
    return null;
  }
  return await fetchSessionPublicKeys(request.session);
}

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

async function getOlmSessionInitializationDataResponder(
  viewer: Viewer,
): Promise<GetOlmSessionInitializationDataResponse> {
  await verifyClientSupported(viewer);

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

export {
  getSessionPublicKeysResponder,
  getOlmSessionInitializationDataResponder,
};
