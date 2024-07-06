// @flow

import * as React from 'react';

import {
  identityLogInActionTypes,
  useIdentityPasswordLogIn,
  logOutActionTypes,
  useLogOut,
} from 'lib/actions/user-actions.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import { securityUpdateLogoutText } from 'lib/types/alert-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useSelector } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import Alert from '../utils/alert.js';

function BackgroundIdentityLoginHandler() {
  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();

  const isAccountWithPassword = useSelector(state =>
    accountHasPassword(state.currentUserInfo),
  );
  const hasAccessToken = useSelector(state => !!state.commServicesAccessToken);
  const dataLoaded = useSelector(state => state.dataLoaded);

  const callIdentityPasswordLogIn = useIdentityPasswordLogIn();

  const handleLogOutAndAlert = React.useCallback(() => {
    void dispatchActionPromise(logOutActionTypes, callLogOut());
    Alert.alert('Security update', securityUpdateLogoutText, [{ text: 'OK' }]);
  }, [dispatchActionPromise, callLogOut]);

  const logInIfPossibleElseLogOut = React.useCallback(async () => {
    if (hasAccessToken || !dataLoaded || !usingCommServicesAccessToken) {
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
    dataLoaded,
    handleLogOutAndAlert,
    hasAccessToken,
    isAccountWithPassword,
  ]);

  React.useEffect(() => {
    void logInIfPossibleElseLogOut();
  }, [logInIfPossibleElseLogOut]);
}

export default BackgroundIdentityLoginHandler;
