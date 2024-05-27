// @flow

import * as React from 'react';

import {
  useFindUserIdentities,
  findUserIdentitiesActionTypes,
} from '../actions/user-actions.js';
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

  React.useEffect(() => {
    const userIDs = Object.keys(userInfosWithMissingUsernames);
    if (!usingCommServicesAccessToken || userIDs.length === 0) {
      return;
    }

    const promise = async () => {
      // 1. Fetch usernames from identity
      const identities = await findUserIdentities(userIDs);

      // 2. Fetch avatars and settings from auth keyserver
      if (relyingOnAuthoritativeKeyserver) {
        // TODO
      }

      const newUserInfos = [];
      for (const id in identities) {
        newUserInfos.push({
          id,
          username: identities[id].username,
        });
      }
      return { userInfos: newUserInfos };
    };
    void dispatchActionPromise(findUserIdentitiesActionTypes, promise());
  }, [
    dispatchActionPromise,
    findUserIdentities,
    userInfos,
    userInfosWithMissingUsernames,
  ]);
}

export { UserInfosHandler };
