// @flow

import * as React from 'react';

import {
  identityLogInActionTypes,
  useIdentityPasswordLogIn,
  logOutActionTypes,
  useLogOut,
} from 'lib/actions/user-actions.js';
import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from 'lib/hooks/account-hooks.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import { securityUpdateLogoutText } from 'lib/types/alert-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useSelector } from 'lib/utils/redux-utils.js';

import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import { useIsAppLoggedIn } from '../navigation/nav-selectors.js';
import Alert from '../utils/alert.js';

function BackgroundIdentityLoginHandler() {
  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();

  const isAccountWithPassword = useSelector(state =>
    accountHasPassword(state.currentUserInfo),
  );
  const hasAccessToken = useSelector(state => !!state.commServicesAccessToken);

  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();
  const navLoggedIn = useIsAppLoggedIn();

  // We don't want to try identity login until both loggedIn and navLoggedIn are
  // true. The former is to make sure that we will be able to successfully log
  // in with identity. The latter is to address a race condition in ENG-8785.
  const readyToTryIdentityLogin = loggedIn && navLoggedIn;

  const callIdentityPasswordLogIn = useIdentityPasswordLogIn();

  const handleLogOutAndAlert = React.useCallback(() => {
    void dispatchActionPromise(logOutActionTypes, callLogOut());
    Alert.alert('Security update', securityUpdateLogoutText, [{ text: 'OK' }]);
  }, [dispatchActionPromise, callLogOut]);

  const loginAttemptedRef = React.useRef(false);

  const logInIfPossibleElseLogOut = React.useCallback(async () => {
    if (
      hasAccessToken ||
      !readyToTryIdentityLogin ||
      loginAttemptedRef.current
    ) {
      return;
    }

    if (!isAccountWithPassword) {
      handleLogOutAndAlert();
      return;
    }

    const nativeCredentials = await fetchNativeKeychainCredentials();
    if (!nativeCredentials) {
      console.log(
        'Native credentials missing. Cannot log in to identity service',
      );
      handleLogOutAndAlert();
      return;
    }

    if (loginAttemptedRef.current) {
      return;
    }
    loginAttemptedRef.current = true;

    const logInPromise = callIdentityPasswordLogIn(
      nativeCredentials.username,
      nativeCredentials.password,
    );
    void dispatchActionPromise(identityLogInActionTypes, logInPromise);

    try {
      await logInPromise;
    } catch (e) {
      console.log('BackgroundIdentityLoginHandler failed identity login', e);
      handleLogOutAndAlert();
    }
  }, [
    callIdentityPasswordLogIn,
    dispatchActionPromise,
    readyToTryIdentityLogin,
    handleLogOutAndAlert,
    hasAccessToken,
    isAccountWithPassword,
  ]);

  React.useEffect(() => {
    void logInIfPossibleElseLogOut();
  }, [logInIfPossibleElseLogOut]);
}

export default BackgroundIdentityLoginHandler;
