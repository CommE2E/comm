// @flow

import * as React from 'react';

import { isLoggedIn } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useSelector } from '../utils/redux-utils.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';

function PlatformDetailsSynchronizer(): null {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;

  const loggedIn = useSelector(isLoggedIn);

  const syncPlatformDetails = React.useCallback(async () => {
    if (!identityClient) {
      throw new Error('Identity service client is not initialized');
    }
    if (!loggedIn) {
      return;
    }
    try {
      await identityClient.syncPlatformDetails();
    } catch (error) {
      console.log('Error syncing platform details:', error);
    }
  }, [identityClient, loggedIn]);

  React.useEffect(() => {
    if (!usingCommServicesAccessToken) {
      return;
    }
    void syncPlatformDetails();
  }, [syncPlatformDetails]);

  return null;
}

export default PlatformDetailsSynchronizer;
