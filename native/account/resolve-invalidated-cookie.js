// @flow

import type { FetchJSON } from 'lib/utils/fetch-json';
import type { DispatchRecoveryAttempt } from 'lib/utils/action-utils';
import type { LogInActionSource } from 'lib/types/account-types';

import { logInActionTypes, logIn } from 'lib/actions/user-actions';

import {
  fetchNativeKeychainCredentials,
  getNativeSharedWebCredentials,
} from './native-credentials';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors';
import { store } from '../redux/redux-setup';
import { getGlobalNavContext } from '../navigation/icky-global';

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
      logIn(fetchJSON, {
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
      logIn(fetchJSON, {
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
