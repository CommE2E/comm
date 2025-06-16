// @flow

import {
  legacyLogInActionTypes,
  legacyLogInRawAction,
} from 'lib/actions/user-actions.js';
import type { CallSingleKeyserverEndpoint } from 'lib/keyserver-conn/call-single-keyserver-endpoint.js';
import {
  type CallKeyserverEndpoint,
  CANCELLED_ERROR,
} from 'lib/keyserver-conn/keyserver-conn-types.js';
import type { InitialNotifMessageOptions } from 'lib/shared/crypto-utils.js';
import type { RecoveryActionSource } from 'lib/types/account-types.js';
import type { DispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { fetchNativeKeychainCredentials } from './native-credentials.js';
import { store } from '../redux/redux-setup.js';
import { nativeLegacyLogInExtraInfoSelector } from '../selectors/account-selectors.js';

async function resolveKeyserverSessionInvalidationUsingNativeCredentials(
  callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  callKeyserverEndpoint: CallKeyserverEndpoint,
  dispatchActionPromise: DispatchActionPromise,
  recoveryActionSource: RecoveryActionSource,
  keyserverID: string,
  getInitialNotificationsEncryptedMessage: (
    ?InitialNotifMessageOptions,
  ) => Promise<string>,
  hasBeenCancelled: () => boolean,
) {
  console.log(
    'Called resolveKeyserverSessionInvalidationUsingNativeCredentials',
    { recoveryActionSource },
  );
  const keychainCredentials = await fetchNativeKeychainCredentials();
  if (!keychainCredentials || hasBeenCancelled()) {
    console.log('No credentials or canceled');
    return;
  }

  const [baseExtraInfo, initialNotificationsEncryptedMessage] =
    await Promise.all([
      nativeLegacyLogInExtraInfoSelector(store.getState())(),
      getInitialNotificationsEncryptedMessage({
        callSingleKeyserverEndpoint,
      }),
    ]);
  if (hasBeenCancelled()) {
    console.log('Canceled err');
    throw new Error(CANCELLED_ERROR);
  }
  const extraInfo = { ...baseExtraInfo, initialNotificationsEncryptedMessage };

  const { calendarQuery } = extraInfo;
  const startingPayload = {
    calendarQuery,
    authActionSource: recoveryActionSource,
  };
  console.log('Dispatching legacyLogin', { startingPayload });
  await dispatchActionPromise(
    legacyLogInActionTypes,
    legacyLogInRawAction(callKeyserverEndpoint)({
      ...keychainCredentials,
      ...extraInfo,
      authActionSource: recoveryActionSource,
      keyserverIDs: [keyserverID],
    }),
    undefined,
    startingPayload,
  );
}

export { resolveKeyserverSessionInvalidationUsingNativeCredentials };
