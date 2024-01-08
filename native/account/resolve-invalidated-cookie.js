// @flow

import { logInActionTypes, logInRawAction } from 'lib/actions/user-actions.js';
import type { InitialNotifMessageOptions } from 'lib/shared/crypto-utils.js';
import type { LogInActionSource } from 'lib/types/account-types.js';
import type { DispatchRecoveryAttempt } from 'lib/utils/action-utils.js';
import type { CallServerEndpoint } from 'lib/utils/call-server-endpoint.js';
import type { CallKeyserverEndpoint } from 'lib/utils/keyserver-call.js';

import { fetchNativeKeychainCredentials } from './native-credentials.js';
import { store } from '../redux/redux-setup.js';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors.js';

async function resolveKeyserverSessionInvalidationUsingNativeCredentials(
  callServerEndpoint: CallServerEndpoint,
  callKeyserverEndpoint: CallKeyserverEndpoint,
  dispatchRecoveryAttempt: DispatchRecoveryAttempt,
  logInActionSource: LogInActionSource,
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
      await getInitialNotificationsEncryptedMessage({ callServerEndpoint });
    extraInfo = { ...extraInfo, initialNotificationsEncryptedMessage };
  }

  const { calendarQuery } = extraInfo;
  await dispatchRecoveryAttempt(
    logInActionTypes,
    logInRawAction(callKeyserverEndpoint)({
      ...keychainCredentials,
      ...extraInfo,
      logInActionSource,
      keyserverIDs: [keyserverID],
    }),
    { calendarQuery },
  );
}

export { resolveKeyserverSessionInvalidationUsingNativeCredentials };
