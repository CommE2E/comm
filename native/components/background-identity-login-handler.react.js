// @flow

import * as React from 'react';

import { logOutActionTypes, useLogOut } from 'lib/actions/user-actions.js';
import { usePasswordLogIn } from 'lib/hooks/login-hooks.js';
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

  const callIdentityPasswordLogIn = usePasswordLogIn();

  const handleLogOutAndAlert = React.useCallback(() => {
    void dispatchActionPromise(logOutActionTypes, callLogOut());
    Alert.alert('Security update', securityUpdateLogoutText, [{ text: 'OK' }]);
  }, [dispatchActionPromise, callLogOut]);

  const logInIfPossibleElseLogOut = React.useCallback(async () => {
    if (hasAccessToken || !dataLoaded || !usingCommServicesAccessToken) {
      return;
    }

    if (isAccountWithPassword) {
      const nativeCredentials = await fetchNativeKeychainCredentials();
      if (!nativeCredentials) {
        return;
      }
      try {
        await callIdentityPasswordLogIn(
          nativeCredentials.username,
          nativeCredentials.password,
        );
      } catch (e) {
        handleLogOutAndAlert();
      }
    } else {
      handleLogOutAndAlert();
    }
  }, [
    callIdentityPasswordLogIn,
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
