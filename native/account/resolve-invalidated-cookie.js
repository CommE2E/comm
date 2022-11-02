// @flow

import { logInActionTypes, logIn } from 'lib/actions/user-actions';
import type { LogInActionSource } from 'lib/types/account-types';
import type { DispatchRecoveryAttempt } from 'lib/utils/action-utils';
import type { CallServerEndpoint } from 'lib/utils/call-server-endpoint';

import { getGlobalNavContext } from '../navigation/icky-global';
import { store } from '../redux/redux-setup';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors';
import { fetchNativeKeychainCredentials } from './native-credentials';

async function resolveInvalidatedCookie(
  callServerEndpoint: CallServerEndpoint,
  dispatchRecoveryAttempt: DispatchRecoveryAttempt,
  logInActionSource: LogInActionSource,
) {
  const keychainCredentials = await fetchNativeKeychainCredentials();
  if (!keychainCredentials) {
    return;
  }
  const extraInfo = nativeLogInExtraInfoSelector({
    redux: store.getState(),
    navContext: getGlobalNavContext(),
  })();
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
