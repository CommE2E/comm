// @flow

import * as React from 'react';

import { setAuxUserFIDsActionType } from '../actions/aux-user-actions.js';
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
import { useSelector, useDispatch } from '../utils/redux-utils.js';
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
  const findUserIdentities =
    identityServiceClient?.identityClient.findUserIdentities;

  const dispatch = useDispatch();
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

  const handleFarcasterMutuals = React.useCallback(async () => {
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

    const followerFIDs = await neynarClient.fetchFriendFIDs(fid);

    const commFCUsers = await getFarcasterUsers(followerFIDs);

    const newCommUsers = commFCUsers.filter(({ userID }) => !userInfos[userID]);

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

  const handleUserStoreFIDs = React.useCallback(async () => {
    if (!loggedIn || !isActive || !findUserIdentities) {
      return;
    }

    const userStoreIDs = Object.keys(userInfos);

    const userIdentities = await findUserIdentities(userStoreIDs);

    const userStoreFarcasterUsers = Object.entries(userIdentities)
      .filter(([, identity]) => identity.farcasterID !== null)
      .map(([userID, identity]) => ({
        userID,
        username: identity.username,
        farcasterID: identity.farcasterID,
      }));

    dispatch({
      type: setAuxUserFIDsActionType,
      payload: {
        farcasterUsers: userStoreFarcasterUsers,
      },
    });
  }, [loggedIn, isActive, findUserIdentities, userInfos, dispatch]);

  React.useEffect(() => {
    if (!usingCommServicesAccessToken) {
      return;
    }

    void handleFarcasterMutuals();
    void handleUserStoreFIDs();
  }, [handleFarcasterMutuals, handleUserStoreFIDs]);

  return null;
}

export { FarcasterDataHandler };
