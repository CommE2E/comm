// @flow

import type { Account as OlmAccount } from '@commapp/olm';
import t from 'tcomb';

import type {
  GetOlmNotifsSessionInitializationDataResponse,
  GetOlmNotifsSessionInitializationDataRequest,
  GetSessionPublicKeysArgs,
} from 'lib/types/request-types.js';
import type { SessionPublicKeys } from 'lib/types/session-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { fetchSessionPublicKeys } from '../fetchers/key-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';
import { validateAccountPrekey } from '../utils/olm-utils.js';
import { validateInput } from '../utils/validation-utils.js';

const getSessionPublicKeysInputValidator = tShape({
  session: t.String,
});

async function getSessionPublicKeysResponder(
  viewer: Viewer,
  input: any,
): Promise<SessionPublicKeys | null> {
  if (!viewer.loggedIn) {
    return null;
  }
  const request: GetSessionPublicKeysArgs = input;
  await validateInput(viewer, getSessionPublicKeysInputValidator, request);
  return await fetchSessionPublicKeys(request.session);
}

const getOlmNotifsSessionInitializationDataRequestInputValidator = tShape({
  oneTimeKeysCount: t.Number,
});

async function getOlmNotifsSessionInitializationDataResponder(
  viewer: Viewer,
  input: any,
): Promise<GetOlmNotifsSessionInitializationDataResponse> {
  await validateInput(
    viewer,
    getOlmNotifsSessionInitializationDataRequestInputValidator,
    input,
  );
  const request: GetOlmNotifsSessionInitializationDataRequest = input;

  let prekey, notificationsIdentityKeysString, oneTimeKeys;
  const notificationsAccountCallback = async (account: OlmAccount) => {
    notificationsIdentityKeysString = account.identity_keys();

    await validateAccountPrekey(account);
    prekey = account.prekey();
    // Until transfer of prekeys to the identity service is not implemented
    // notifs prekey will be marked as published each time it is accessed
    // to establish olm notifs session to mitigate the risk of notifs
    // prekey being in use long enough to cause security concerns
    account.mark_prekey_as_published();

    account.generate_one_time_keys(request.oneTimeKeysCount);
    oneTimeKeys = account.one_time_keys();
    account.mark_keys_as_published();
  };

  await fetchCallUpdateOlmAccount(
    'notifications',
    notificationsAccountCallback,
  );
  if (!prekey || !oneTimeKeys) {
    throw new ServerError('olm_account_query_failure');
  }

  let identityKeysBlob, identityKeysBlobPayload, signedIdentityKeysBlob;
  const primaryAccountCallback = async (account: OlmAccount) => {
    identityKeysBlob = {
      primaryIdentityPublicKeys: JSON.parse(account.identity_keys()),
      notificationIdentityPublicKeys: JSON.parse(
        notificationsIdentityKeysString,
      ),
    };
    identityKeysBlobPayload = JSON.stringify(identityKeysBlob);
    signedIdentityKeysBlob = {
      payload: identityKeysBlobPayload,
      signature: account.sign(identityKeysBlobPayload),
    };
  };

  await fetchCallUpdateOlmAccount('primary', primaryAccountCallback);
  if (!signedIdentityKeysBlob) {
    throw new ServerError('olm_account_query_failure');
  }

  return {
    signedIdentityKeysBlob,
    prekey,
    oneTimeKeys,
  };
}

export {
  getSessionPublicKeysResponder,
  getOlmNotifsSessionInitializationDataResponder,
};
