// @flow

import t from 'tcomb';

import type {
  GetOlmSessionInitializationDataResponse,
  GetOlmSessionInitializationDataRequest,
  GetSessionPublicKeysArgs,
} from 'lib/types/request-types.js';
import type { SessionPublicKeys } from 'lib/types/session-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { fetchSessionPublicKeys } from '../fetchers/key-fetchers.js';
import { fetchKeyserverOlmAccount } from '../fetchers/olm-account-fetcher.js';
import type { Viewer } from '../session/viewer.js';
import { updateOlmAccount } from '../updaters/olm-account-updater.js';
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

const getOlmSessionInitializationDataRequestInputValidator = tShape({
  olmSessionType: t.enums.of(['primary', 'notifications']),
  oneTimeKeysCount: t.Number,
});

async function getOlmSessionInitializationDataResponder(
  viewer: Viewer,
  input: any,
): Promise<GetOlmSessionInitializationDataResponse> {
  await validateInput(
    viewer,
    getOlmSessionInitializationDataRequestInputValidator,
    input,
  );
  const request: GetOlmSessionInitializationDataRequest = input;

  const { account, picklingKey } = await fetchKeyserverOlmAccount(
    input.olmSessionType,
  );

  await validateAccountPrekey(account);
  const prekey = account.prekey();

  account.generate_one_time_keys(request.oneTimeKeysCount);
  const oneTimeKeys = account.one_time_keys();
  account.mark_keys_as_published();

  const identityKeys = account.identity_keys();

  const isPrimary = request.olmSessionType === 'primary';
  await updateOlmAccount(account, picklingKey, isPrimary);

  return {
    identityKeys,
    prekey,
    oneTimeKeys,
  };
}

export {
  getSessionPublicKeysResponder,
  getOlmSessionInitializationDataResponder,
};
