// @flow

import invariant from 'invariant';
import * as React from 'react';

import { setPeerDeviceListsActionType } from '../actions/aux-user-actions.js';
import { getRelativeUserIDs } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
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
      const userDeviceLists =
        await identityContext.identityClient.getDeviceListsForUsers(
          relativeUserIDs,
        );
      const usersRawDeviceLists =
        convertSignedDeviceListsToRawDeviceLists(userDeviceLists);
      dispatch({
        type: setPeerDeviceListsActionType,
        payload: { deviceLists: usersRawDeviceLists },
      });
    } catch (e) {
      console.log(`Error creating initial peer list: ${e.message}`);
    }
  }, [dispatch, identityContext, relativeUserIDs]);
}

export { useCreateInitialPeerList };
