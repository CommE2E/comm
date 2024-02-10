// @flow

import { logInActionTypes, logInRawAction } from 'lib/actions/user-actions.js';
import type {
  DispatchRecoveryAttempt,
  CallKeyserverEndpoint,
} from 'lib/keyserver-conn/keyserver-conn-types.js';
import type { InitialNotifMessageOptions } from 'lib/shared/crypto-utils.js';
import type { RecoveryActionSource } from 'lib/types/account-types.js';
import type { CallSingleKeyserverEndpoint } from 'lib/utils/call-single-keyserver-endpoint.js';

import { fetchNativeKeychainCredentials } from './native-credentials.js';
import { store } from '../redux/redux-setup.js';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors.js';

async function resolveKeyserverSessionInvalidationUsingNativeCredentials(
  callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  callKeyserverEndpoint: CallKeyserverEndpoint,
  dispatchRecoveryAttempt: DispatchRecoveryAttempt,
  recoveryActionSource: RecoveryActionSource,
  keyserverID: string,
  getInitialNotificationsEncryptedMessage?: (
    ?InitialNotifMessageOptions,
  ) => Promise<string>,
) {
  const keychainCredentials = await fetchNativeKeychainCredentials();
  if (!keychainCredentials) {
    return;
  }
  let extraInfo = await nativeLogInExtraInfoSelector(store.getState())();

  if (getInitialNotificationsEncryptedMessage) {
    const initialNotificationsEncryptedMessage =
      await getInitialNotificationsEncryptedMessage({
        callSingleKeyserverEndpoint,
      });
    extraInfo = { ...extraInfo, initialNotificationsEncryptedMessage };
  }

  const { calendarQuery } = extraInfo;
  await dispatchRecoveryAttempt(
    logInActionTypes,
    logInRawAction(callKeyserverEndpoint)({
      ...keychainCredentials,
      ...extraInfo,
      authActionSource: recoveryActionSource,
      keyserverIDs: [keyserverID],
    }),
    { calendarQuery },
  );
}

export { resolveKeyserverSessionInvalidationUsingNativeCredentials };
