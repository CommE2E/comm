// @flow

import * as React from 'react';

import { setPeerDeviceListsActionType } from '../actions/aux-user-actions.js';
import {
  useFindUserIdentities,
  findUserIdentitiesActionTypes,
} from '../actions/user-actions.js';
import { useGetDeviceListsForUsers } from '../hooks/peer-list-hooks.js';
import { usersWithMissingDeviceListSelector } from '../selectors/user-selectors.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';
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

  React.useEffect(() => {
    const newUserIDs = Object.keys(userInfosWithMissingUsernames).filter(
      id => !requestedIDsRef.current.has(id),
    );
    if (!usingCommServicesAccessToken || newUserIDs.length === 0) {
      return;
    }

    const promise = (async () => {
      newUserIDs.forEach(id => requestedIDsRef.current.add(id));
      // 1. Fetch usernames from identity
      const identities = await findUserIdentities(newUserIDs);

      // 2. Fetch avatars and settings from auth keyserver
      if (relyingOnAuthoritativeKeyserver) {
        // TODO
      }
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
  }, [
    dispatchActionPromise,
    findUserIdentities,
    userInfos,
    userInfosWithMissingUsernames,
  ]);

  const usersWithMissingDeviceList = useSelector(
    usersWithMissingDeviceListSelector,
  );
  const getDeviceListsForUsers = useGetDeviceListsForUsers();
  const dispatch = useDispatch();
  React.useEffect(() => {
    if (
      !usingCommServicesAccessToken ||
      usersWithMissingDeviceList.length === 0
    ) {
      return;
    }
    void (async () => {
      const deviceLists = await getDeviceListsForUsers(
        usersWithMissingDeviceList,
      );
      if (Object.keys(deviceLists).length === 0) {
        return;
      }
      dispatch({
        type: setPeerDeviceListsActionType,
        payload: { deviceLists },
      });
    })();
  }, [dispatch, getDeviceListsForUsers, usersWithMissingDeviceList]);
}

export { UserInfosHandler };
