// @flow

import * as React from 'react';

import {
  updateRelationships,
  updateRelationshipsActionTypes,
} from '../actions/relationship-actions.js';
import {
  useFindUserIdentities,
  findUserIdentitiesActionTypes,
} from '../actions/user-actions.js';
import { useGetAndUpdateDeviceListsForUsers } from '../hooks/peer-list-hooks.js';
import { useLegacyAshoatKeyserverCall } from '../keyserver-conn/legacy-keyserver-call.js';
import {
  usersWithMissingDeviceListSelector,
  isLoggedInToAuthoritativeKeyserver,
} from '../selectors/user-selectors.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import { relationshipActions } from '../types/relationship-types.js';
import { getMessageForException } from '../utils/errors.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';
import {
  relyingOnAuthoritativeKeyserver,
  usingCommServicesAccessToken,
} from '../utils/services-utils.js';

function UserInfosHandler(): React.Node {
  const userInfos = useSelector(state => state.userStore.userInfos);

  const userInfosWithMissingUsernames = React.useMemo(() => {
    const entriesWithoutUsernames = Object.entries(userInfos).filter(
      ([, value]) => !value.username,
    );
    return Object.fromEntries(entriesWithoutUsernames);
  }, [userInfos]);

  const dispatchActionPromise = useDispatchActionPromise();
  const findUserIdentities = useFindUserIdentities();

  const requestedIDsRef = React.useRef(new Set<string>());

  const callUpdateRelationships =
    useLegacyAshoatKeyserverCall(updateRelationships);

  const currentUserInfo = useSelector(state => state.currentUserInfo);

  const loggedInToAuthKeyserver = useSelector(
    isLoggedInToAuthoritativeKeyserver,
  );

  React.useEffect(() => {
    if (!loggedInToAuthKeyserver) {
      return;
    }
    const newUserIDs = Object.keys(userInfosWithMissingUsernames).filter(
      id => !requestedIDsRef.current.has(id),
    );
    if (!usingCommServicesAccessToken || newUserIDs.length === 0) {
      return;
    }
    // 1. Fetch usernames from identity
    const promise = (async () => {
      newUserIDs.forEach(id => requestedIDsRef.current.add(id));
      const identities = await findUserIdentities(newUserIDs);
      newUserIDs.forEach(id => requestedIDsRef.current.delete(id));

      const newUserInfos = [];
      for (const id in identities) {
        newUserInfos.push({
          id,
          username: identities[id].username,
        });
      }
      return { userInfos: newUserInfos };
    })();
    void dispatchActionPromise(findUserIdentitiesActionTypes, promise);
    // 2. Fetch avatars from auth keyserver
    if (relyingOnAuthoritativeKeyserver) {
      const userIDsWithoutOwnID = newUserIDs.filter(
        id => id !== currentUserInfo?.id,
      );
      if (userIDsWithoutOwnID.length === 0) {
        return;
      }
      void dispatchActionPromise(
        updateRelationshipsActionTypes,
        callUpdateRelationships({
          action: relationshipActions.ACKNOWLEDGE,
          userIDs: userIDsWithoutOwnID,
        }),
      );
    }
  }, [
    callUpdateRelationships,
    currentUserInfo?.id,
    dispatchActionPromise,
    findUserIdentities,
    userInfos,
    userInfosWithMissingUsernames,
    loggedInToAuthKeyserver,
  ]);

  const usersWithMissingDeviceList = useSelector(
    usersWithMissingDeviceListSelector,
  );
  const getAndUpdateDeviceListsForUsers = useGetAndUpdateDeviceListsForUsers();
  const { socketState } = useTunnelbroker();
  React.useEffect(() => {
    if (
      !usingCommServicesAccessToken ||
      usersWithMissingDeviceList.length === 0 ||
      !socketState.isAuthorized
    ) {
      return;
    }
    void (async () => {
      try {
        await getAndUpdateDeviceListsForUsers(usersWithMissingDeviceList, true);
      } catch (e) {
        console.log(
          `Error getting and setting peer device list: ${
            getMessageForException(e) ?? 'unknown'
          }`,
        );
      }
    })();
  }, [
    socketState.isAuthorized,
    getAndUpdateDeviceListsForUsers,
    usersWithMissingDeviceList,
  ]);
}

export { UserInfosHandler };
