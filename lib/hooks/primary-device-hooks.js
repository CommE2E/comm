// @flow

import invariant from 'invariant';
import * as React from 'react';

import { getOwnPeerDevices } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useSelector } from '../utils/redux-utils.js';

function useCheckIfPrimaryDevice(): () => Promise<boolean> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'identity context not set');
  const { getAuthMetadata } = identityContext;

  const userDevicesInfos = useSelector(getOwnPeerDevices);

  return React.useCallback(async () => {
    if (userDevicesInfos.length === 0) {
      return false;
    }
    const primaryDeviceID = userDevicesInfos[0].deviceID;
    const { deviceID } = await getAuthMetadata();
    return primaryDeviceID === deviceID;
  }, [getAuthMetadata, userDevicesInfos]);
}

export { useCheckIfPrimaryDevice };
