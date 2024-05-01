// @flow

import * as React from 'react';

import { logOutActionTypes, useLogOut } from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import { securityUpdateLogoutText } from 'lib/types/alert-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useSelector } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import Alert from '../utils/alert.js';

function BackgroundIdentityLoginHandler() {
  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();

  const isAccountWithPassword = useSelector(state =>
    accountHasPassword(state.currentUserInfo),
  );
  const hasAccessToken = useSelector(state => !!state.commServicesAccessToken);
  const dataLoaded = useSelector(state => state.dataLoaded);

  const { pushModal } = useModalContext();

  React.useEffect(() => {
    if (hasAccessToken || !dataLoaded || !usingCommServicesAccessToken) {
      return;
    }
    if (!isAccountWithPassword) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
      Alert.alert('Security update', securityUpdateLogoutText, [
        { text: 'OK' },
      ]);
    }
  }, [
    callLogOut,
    dataLoaded,
    dispatchActionPromise,
    hasAccessToken,
    isAccountWithPassword,
    pushModal,
  ]);
}

export default BackgroundIdentityLoginHandler;
