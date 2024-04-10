// @flow

import * as React from 'react';

import {
  updateRelationships as serverUpdateRelationships,
  updateRelationshipsActionTypes,
} from '../actions/relationship-actions.js';
import { NeynarClientContext } from '../components/neynar-client-provider.react.js';
import { cookieSelector } from '../selectors/keyserver-selectors.js';
import { currentUserFIDSelector } from '../selectors/synced-metadata-selectors.js';
import { isLoggedIn } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { relationshipActions } from '../types/relationship-types.js';
import { useLegacyAshoatKeyserverCall } from '../utils/action-utils.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';

function FarcasterDataHandler(): React.Node {
  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const hasCurrentUserInfo = useSelector(isLoggedIn);
  const cookie = useSelector(cookieSelector(authoritativeKeyserverID()));
  const hasUserCookie = !!(cookie && cookie.startsWith('user='));
  const loggedIn = hasCurrentUserInfo && hasUserCookie;

  const neynarClient = React.useContext(NeynarClientContext)?.client;

  const identityServiceClient = React.useContext(IdentityClientContext);
  const getFarcasterUsers =
    identityServiceClient?.identityClient.getFarcasterUsers;

  const dispatchActionPromise = useDispatchActionPromise();
  const updateRelationships = useLegacyAshoatKeyserverCall(
    serverUpdateRelationships,
  );
  const createThreadsAndRobotextForFarcasterMutuals = React.useCallback(
    (userIDs: $ReadOnlyArray<string>) =>
      updateRelationships({
        action: relationshipActions.FARCASTER_MUTUAL,
        userIDs,
      }),
    [updateRelationships],
  );

  const userInfos = useSelector(state => state.userStore.userInfos);

  const fid = useSelector(currentUserFIDSelector);

  const prevCanQueryRef = React.useRef<?boolean>();
  React.useEffect(() => {
    if (!usingCommServicesAccessToken) {
      return;
    }

    const canQuery = isActive && !!fid && loggedIn;
    if (canQuery === prevCanQueryRef.current) {
      return;
    }
    prevCanQueryRef.current = canQuery;

    if (!loggedIn || !isActive || !fid || !neynarClient || !getFarcasterUsers) {
      return;
    }

    void (async () => {
      const followerFIDs = await neynarClient.fetchFriendFIDs(fid);

      const commFCUsers = await getFarcasterUsers(followerFIDs);

      const commUserIDs = commFCUsers.map(({ userID }) => userID);

      const newCommUserIDs = commUserIDs.filter(userID => !userInfos[userID]);
      if (newCommUserIDs.length === 0) {
        return;
      }

      void dispatchActionPromise(
        updateRelationshipsActionTypes,
        createThreadsAndRobotextForFarcasterMutuals(newCommUserIDs),
      );
    })();
  }, [
    isActive,
    fid,
    loggedIn,
    neynarClient,
    getFarcasterUsers,
    userInfos,
    dispatchActionPromise,
    createThreadsAndRobotextForFarcasterMutuals,
  ]);

  return null;
}

export { FarcasterDataHandler };
