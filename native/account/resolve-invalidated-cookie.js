// @flow

import { logInActionTypes, logIn } from 'lib/actions/user-actions.js';
import type { LogInActionSource } from 'lib/types/account-types.js';
import type { DispatchRecoveryAttempt } from 'lib/utils/action-utils.js';
import type { CallServerEndpoint } from 'lib/utils/call-server-endpoint.js';

import { fetchNativeKeychainCredentials } from './native-credentials.js';
import { getGlobalNavContext } from '../navigation/icky-global.js';
import { store } from '../redux/redux-setup.js';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors.js';

async function resolveInvalidatedCookie(
  callServerEndpoint: CallServerEndpoint,
  dispatchRecoveryAttempt: DispatchRecoveryAttempt,
  logInActionSource: LogInActionSource,
  getInitialNotificationsEncryptedMessage?: () => Promise<string>,
) {
  console.log('resolving');
  const keychainCredentials = await fetchNativeKeychainCredentials();
  if (!keychainCredentials) {
    return;
  }
  let extraInfo = await nativeLogInExtraInfoSelector({
    redux: store.getState(),
    navContext: getGlobalNavContext(),
  })();

  if (getInitialNotificationsEncryptedMessage) {
    const initialNotificationsEncryptedMessage =
      await getInitialNotificationsEncryptedMessage();
    extraInfo = { ...extraInfo, initialNotificationsEncryptedMessage };
  }

  const { calendarQuery } = extraInfo;
  await dispatchRecoveryAttempt(
    logInActionTypes,
    logIn(callServerEndpoint)({
      ...keychainCredentials,
      ...extraInfo,
      logInActionSource,
    }),
    { calendarQuery },
  );
}

export { resolveInvalidatedCookie };
