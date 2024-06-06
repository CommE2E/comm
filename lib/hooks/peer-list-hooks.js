// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setPeerDeviceListsActionType } from '../actions/aux-user-actions.js';
import { getRelativeUserIDs } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import type {
  UsersRawDeviceLists,
  UsersDevicesPlatformDetails,
} from '../types/identity-service-types.js';
import { convertSignedDeviceListsToRawDeviceLists } from '../utils/device-list-utils.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

function useCreateInitialPeerList(): () => Promise<void> {
  const dispatch = useDispatch();
  const relativeUserIDs = useSelector(getRelativeUserIDs);

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  return React.useCallback(async () => {
    if (!identityContext) {
      return;
    }
    try {
      const peersDeviceLists =
        await identityContext.identityClient.getDeviceListsForUsers(
          relativeUserIDs,
        );
      const usersRawDeviceLists = convertSignedDeviceListsToRawDeviceLists(
        peersDeviceLists.usersSignedDeviceLists,
      );
      const usersPlatformDetails = peersDeviceLists.usersDevicesPlatformDetails;

      dispatch({
        type: setPeerDeviceListsActionType,
        payload: { deviceLists: usersRawDeviceLists, usersPlatformDetails },
      });
    } catch (e) {
      console.log(`Error creating initial peer list: ${e.message}`);
    }
  }, [dispatch, identityContext, relativeUserIDs]);
}

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

export { useCreateInitialPeerList, useGetDeviceListsForUsers };
