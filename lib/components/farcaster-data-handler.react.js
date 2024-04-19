// @flow

import * as React from 'react';

import {
  updateRelationships as serverUpdateRelationships,
  updateRelationshipsActionTypes,
} from '../actions/relationship-actions.js';
import { NeynarClientContext } from '../components/neynar-client-provider.react.js';
import { useLegacyAshoatKeyserverCall } from '../keyserver-conn/legacy-keyserver-call.js';
import { cookieSelector } from '../selectors/keyserver-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { relationshipActions } from '../types/relationship-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { useCurrentUserFID } from '../utils/farcaster-utils.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';

function FarcasterDataHandler(): React.Node {
  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const cookie = useSelector(cookieSelector(authoritativeKeyserverID()));
  const hasUserCookie = !!(cookie && cookie.startsWith('user='));
  const currentUserID = useSelector(state => state.currentUserInfo?.id);
  const loggedIn = !!currentUserID && hasUserCookie;

  const neynarClient = React.useContext(NeynarClientContext)?.client;

  const identityServiceClient = React.useContext(IdentityClientContext);
  const getFarcasterUsers =
    identityServiceClient?.identityClient.getFarcasterUsers;

  const dispatchActionPromise = useDispatchActionPromise();
  const updateRelationships = useLegacyAshoatKeyserverCall(
    serverUpdateRelationships,
  );
  const createThreadsAndRobotextForFarcasterMutuals = React.useCallback(
    (userIDsToFID: { +[userID: string]: string }) =>
      updateRelationships({
        action: relationshipActions.FARCASTER_MUTUAL,
        userIDsToFID,
      }),
    [updateRelationships],
  );

  const userInfos = useSelector(state => state.userStore.userInfos);

  const fid = useCurrentUserFID();

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

    if (
      !loggedIn ||
      !isActive ||
      !fid ||
      !neynarClient ||
      !getFarcasterUsers ||
      !currentUserID
    ) {
      return;
    }

    void (async () => {
      const followerFIDs = await neynarClient.fetchFriendFIDs(fid);

      const commFCUsers = await getFarcasterUsers(followerFIDs);

      const newCommUsers = commFCUsers.filter(
        ({ userID }) => !userInfos[userID],
      );

      if (newCommUsers.length === 0) {
        return;
      }

      const userIDsToFID: { +[userID: string]: string } = Object.fromEntries(
        newCommUsers.map(({ userID, farcasterID }) => [userID, farcasterID]),
      );

      const userIDsToFIDIncludingCurrentUser: { +[userID: string]: string } = {
        ...userIDsToFID,
        [(currentUserID: string)]: fid,
      };

      void dispatchActionPromise(
        updateRelationshipsActionTypes,
        createThreadsAndRobotextForFarcasterMutuals(
          userIDsToFIDIncludingCurrentUser,
        ),
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
    currentUserID,
  ]);

  return null;
}

export { FarcasterDataHandler };
