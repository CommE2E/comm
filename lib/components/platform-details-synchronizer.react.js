// @flow

import invariant from 'invariant';
import * as React from 'react';

import { isLoggedIn } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useSelector } from '../utils/redux-utils.js';

function PlatformDetailsSynchronizer(): React.Node {
  const client = React.useContext(IdentityClientContext);
  invariant(client, 'Identity context should be set');
  const identityClient = client.identityClient;
  const getAuthMetadata = client.getAuthMetadata;

  const loggedIn = useSelector(isLoggedIn);

  const syncPlatformDetails = React.useCallback(async () => {
    if (!identityClient) {
      throw new Error('Identity service client is not initialized');
    }
    if (!loggedIn) {
      return;
    }
    const authMetadata = await getAuthMetadata();
    if (!authMetadata) {
      return;
    }
    try {
      await identityClient.syncPlatformDetails();
    } catch (error) {
      console.log('Error syncing platform details:', error);
    }
  }, [identityClient, loggedIn, getAuthMetadata]);

  const hasRun = React.useRef<boolean>(false);
  React.useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    void syncPlatformDetails();
  }, [syncPlatformDetails]);

  return null;
}

export default PlatformDetailsSynchronizer;
