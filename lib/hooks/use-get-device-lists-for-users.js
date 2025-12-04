// @flow

import invariant from 'invariant';
import * as React from 'react';

import { IdentityClientContext } from '../shared/identity-client-context.js';
import type {
  UsersDevicesPlatformDetails,
  UsersRawDeviceLists,
} from '../types/identity-service-types.js';
import { convertSignedDeviceListsToRawDeviceLists } from '../utils/device-list-utils.js';

function useGetDeviceListsForUsers(): (
  userIDs: $ReadOnlyArray<string>,
) => Promise<{
  +deviceLists: UsersRawDeviceLists,
  +usersPlatformDetails: UsersDevicesPlatformDetails,
}> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  return React.useCallback(
    async (userIDs: $ReadOnlyArray<string>) => {
      const peersDeviceLists =
        await identityClient.getDeviceListsForUsers(userIDs);
      return {
        deviceLists: convertSignedDeviceListsToRawDeviceLists(
          peersDeviceLists.usersSignedDeviceLists,
        ),
        usersPlatformDetails: peersDeviceLists.usersDevicesPlatformDetails,
      };
    },
    [identityClient],
  );
}

export { useGetDeviceListsForUsers };
