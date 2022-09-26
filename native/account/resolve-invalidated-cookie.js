// @flow

import { logInActionTypes, logIn } from 'lib/actions/user-actions';
import type { LogInActionSourceType } from 'lib/types/account-types';
import type { DispatchRecoveryAttempt } from 'lib/utils/action-utils';
import type { FetchJSON } from 'lib/utils/fetch-json';

import { getGlobalNavContext } from '../navigation/icky-global';
import { store } from '../redux/redux-setup';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors';
import { fetchNativeKeychainCredentials } from './native-credentials';

async function resolveInvalidatedCookie(
  fetchJSON: FetchJSON,
  dispatchRecoveryAttempt: DispatchRecoveryAttempt,
  source?: LogInActionSourceType,
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
    logIn(fetchJSON)({
      ...keychainCredentials,
      ...extraInfo,
      source,
    }),
    { calendarQuery },
  );
}

export { resolveInvalidatedCookie };
