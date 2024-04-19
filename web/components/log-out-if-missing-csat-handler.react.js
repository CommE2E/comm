// @flow

import * as React from 'react';

import { logOutActionTypes, useLogOut } from 'lib/actions/user-actions.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useSelector } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

function LogOutIfMissingCSATHandler() {
  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();

  const hasAccessToken = useSelector(state => !!state.commServicesAccessToken);
  const dataLoaded = useSelector(state => state.dataLoaded);

  React.useEffect(() => {
    if (!hasAccessToken && dataLoaded && usingCommServicesAccessToken) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [callLogOut, dataLoaded, dispatchActionPromise, hasAccessToken]);
}

export default LogOutIfMissingCSATHandler;
