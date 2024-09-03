// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  updateRelationships,
  updateRelationshipsActionTypes,
} from '../actions/relationship-actions.js';
import {
  useFindUserIdentities,
  findUserIdentitiesActionTypes,
} from '../actions/user-actions.js';
import { useIsLoggedInToAuthoritativeKeyserver } from '../hooks/account-hooks.js';
import { useGetAndUpdateDeviceListsForUsers } from '../hooks/peer-list-hooks.js';
import { useLegacyAshoatKeyserverCall } from '../keyserver-conn/legacy-keyserver-call.js';
import { usersWithMissingDeviceListSelector } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
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
  const client = React.useContext(IdentityClientContext);
  invariant(client, 'Identity context should be set');
  const { getAuthMetadata } = client;

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
  const requestedAvatarsRef = React.useRef(new Set<string>());

  const callUpdateRelationships =
    useLegacyAshoatKeyserverCall(updateRelationships);

  const currentUserInfo = useSelector(state => state.currentUserInfo);

  const loggedInToAuthKeyserver = useIsLoggedInToAuthoritativeKeyserver();

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
    void (async () => {
      const authMetadata = await getAuthMetadata();
      if (!authMetadata) {
        return;
      }
      // 1. Fetch usernames from identity
      const promise = (async () => {
        newUserIDs.forEach(id => requestedIDsRef.current.add(id));
        const { identities, reservedUserIdentifiers } =
          await findUserIdentities(newUserIDs);

        newUserIDs.forEach(id => requestedIDsRef.current.delete(id));

        const newUserInfos = [];
        for (const id in identities) {
          newUserInfos.push({
            id,
            username: identities[id].username,
          });
        }
        for (const id in reservedUserIdentifiers) {
          newUserInfos.push({
            id,
            username: reservedUserIdentifiers[id],
          });
        }
        return { userInfos: newUserInfos };
      })();
      void dispatchActionPromise(findUserIdentitiesActionTypes, promise);
      // 2. Fetch avatars from auth keyserver
      if (relyingOnAuthoritativeKeyserver) {
        const userIDsWithoutOwnID = newUserIDs
          .filter(id => id !== currentUserInfo?.id)
          .filter(id => !requestedAvatarsRef.current.has(id));

        if (userIDsWithoutOwnID.length === 0) {
          return;
        }

        userIDsWithoutOwnID.forEach(id => requestedAvatarsRef.current.add(id));

        void dispatchActionPromise(
          updateRelationshipsActionTypes,
          callUpdateRelationships({
            action: relationshipActions.ACKNOWLEDGE,
            userIDs: userIDsWithoutOwnID,
          }),
        );
      }
    })();
  }, [
    getAuthMetadata,
    callUpdateRelationships,
    currentUserInfo?.id,
    dispatchActionPromise,
    findUserIdentities,
    userInfos,
    userInfosWithMissingUsernames,
    loggedInToAuthKeyserver,
  ]);

  const usersWithMissingDeviceListSelected = useSelector(
    usersWithMissingDeviceListSelector,
  );
  const getAndUpdateDeviceListsForUsers = useGetAndUpdateDeviceListsForUsers();
  const { socketState } = useTunnelbroker();

  const requestedDeviceListsIDsRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    const usersWithMissingDeviceList =
      usersWithMissingDeviceListSelected.filter(
        id => !requestedDeviceListsIDsRef.current.has(id),
      );

    if (
      !usingCommServicesAccessToken ||
      usersWithMissingDeviceList.length === 0 ||
      !socketState.isAuthorized
    ) {
      return;
    }
    void (async () => {
      const authMetadata = await getAuthMetadata();
      if (!authMetadata) {
        return;
      }
      try {
        usersWithMissingDeviceList.forEach(id =>
          requestedDeviceListsIDsRef.current.add(id),
        );
        const foundDeviceListIDs = await getAndUpdateDeviceListsForUsers(
          usersWithMissingDeviceList,
          true,
        );
        Object.keys(foundDeviceListIDs).forEach(id =>
          requestedDeviceListsIDsRef.current.delete(id),
        );
      } catch (e) {
        console.log(
          `Error getting and setting peer device list: ${
            getMessageForException(e) ?? 'unknown'
          }`,
        );
      }
    })();
  }, [
    getAndUpdateDeviceListsForUsers,
    getAuthMetadata,
    socketState.isAuthorized,
    usersWithMissingDeviceListSelected,
  ]);
}

export { UserInfosHandler };
