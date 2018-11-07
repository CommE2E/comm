// @flow

import type { FetchJSON } from 'lib/utils/fetch-json';
import type { DispatchRecoveryAttempt } from 'lib/utils/action-utils';

import { logInActionTypes, logIn } from 'lib/actions/user-actions';

import {
  fetchNativeKeychainCredentials,
  getNativeSharedWebCredentials,
} from './native-credentials';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors';
import { store } from '../redux-setup';

async function resolveInvalidatedCookie(
  fetchJSON: FetchJSON,
  dispatchRecoveryAttempt: DispatchRecoveryAttempt,
) {
  const keychainCredentials = await fetchNativeKeychainCredentials();
  if (keychainCredentials) {
    const extraInfo = nativeLogInExtraInfoSelector(store.getState())();
    const { calendarQuery } = extraInfo;
    const newCookie = await dispatchRecoveryAttempt(
      logInActionTypes,
      logIn(
        fetchJSON,
        {
          usernameOrEmail: keychainCredentials.username,
          password: keychainCredentials.password,
          ...extraInfo,
        },
      ),
      { calendarQuery },
    );
    if (newCookie) {
      return;
    }
  }
  const sharedWebCredentials = getNativeSharedWebCredentials();
  if (sharedWebCredentials) {
    const extraInfo = nativeLogInExtraInfoSelector(store.getState())();
    const { calendarQuery } = extraInfo;
    await dispatchRecoveryAttempt(
      logInActionTypes,
      logIn(
        fetchJSON,
        {
          usernameOrEmail: sharedWebCredentials.username,
          password: sharedWebCredentials.password,
          ...extraInfo,
        },
      ),
      { calendarQuery },
    );
  }
}

export {
  resolveInvalidatedCookie,
};
