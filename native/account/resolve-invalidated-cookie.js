// @flow

import { logInActionTypes, logIn } from 'lib/actions/user-actions';
import type { LogInActionSource } from 'lib/types/account-types';
import type { DispatchRecoveryAttempt } from 'lib/utils/action-utils';
import type { FetchJSON } from 'lib/utils/fetch-json';

import { getGlobalNavContext } from '../navigation/icky-global';
import { store } from '../redux/redux-setup';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors';
import {
  fetchNativeKeychainCredentials,
  getNativeSharedWebCredentials,
} from './native-credentials';

async function resolveInvalidatedCookie(
  fetchJSON: FetchJSON,
  dispatchRecoveryAttempt: DispatchRecoveryAttempt,
  source?: LogInActionSource,
) {
  const keychainCredentials = await fetchNativeKeychainCredentials();
  if (keychainCredentials) {
    const extraInfo = nativeLogInExtraInfoSelector({
      redux: store.getState(),
      navContext: getGlobalNavContext(),
    })();
    const { calendarQuery } = extraInfo;
    const newCookie = await dispatchRecoveryAttempt(
      logInActionTypes,
      logIn(fetchJSON)({
        usernameOrEmail: keychainCredentials.username,
        password: keychainCredentials.password,
        source,
        ...extraInfo,
      }),
      { calendarQuery },
    );
    if (newCookie) {
      return;
    }
  }
  const sharedWebCredentials = getNativeSharedWebCredentials();
  if (sharedWebCredentials) {
    const extraInfo = nativeLogInExtraInfoSelector({
      redux: store.getState(),
      navContext: getGlobalNavContext(),
    })();
    const { calendarQuery } = extraInfo;
    await dispatchRecoveryAttempt(
      logInActionTypes,
      logIn(fetchJSON)({
        usernameOrEmail: sharedWebCredentials.username,
        password: sharedWebCredentials.password,
        source,
        ...extraInfo,
      }),
      { calendarQuery },
    );
  }
}

export { resolveInvalidatedCookie };
