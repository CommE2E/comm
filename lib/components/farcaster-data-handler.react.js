// @flow

import * as React from 'react';

import { NeynarClientContext } from './neynar-client-provider.react.js';
import { useUserIdentityCache } from './user-identity-cache.react.js';
import { setAuxUserFIDsActionType } from '../actions/aux-user-actions.js';
import { updateRelationshipsActionTypes } from '../actions/relationship-actions.js';
import { setSyncedMetadataEntryActionType } from '../actions/synced-metadata-actions.js';
import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from '../hooks/account-hooks.js';
import { useUpdateRelationships } from '../hooks/relationship-hooks.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { relationshipActions } from '../types/relationship-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
import { useCurrentUserFID, useUnlinkFID } from '../utils/farcaster-utils.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';

type Props = {
  +children?: React.Node,
};

function FarcasterDataHandler(props: Props): React.Node {
  const { children } = props;

  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const currentUserID = useSelector(state => state.currentUserInfo?.id);

  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();

  const neynarClient = React.useContext(NeynarClientContext)?.client;

  const identityServiceClient = React.useContext(IdentityClientContext);
  const getFarcasterUsers =
    identityServiceClient?.identityClient.getFarcasterUsers;

  const { getCachedUserIdentity, getUserIdentities: findUserIdentities } =
    useUserIdentityCache();

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();

  const updateRelationships = useUpdateRelationships();
  const createThreadsAndRobotextForFarcasterMutuals = React.useCallback(
    (userIDs: $ReadOnlyArray<string>) =>
      updateRelationships(relationshipActions.FARCASTER_MUTUAL, userIDs),
    [updateRelationships],
  );

  const userInfos = useSelector(state => state.userStore.userInfos);

  const fid = useCurrentUserFID();

  const unlinkFID = useUnlinkFID();

  const prevCanQueryRef = React.useRef<?boolean>();

  // It's possible for the user to log out while handleFarcasterMutuals below
  // is running. It's not a big deal, but this can lead to a useless server call
  // at the end. To avoid that useless server call, we want to check whether the
  // user is logged in beforehand, but the value of loggedIn bound in the
  // callback will be outdated. Instead, we can check this ref, which will be
  // updated on every render.
  const loggedInRef = React.useRef(loggedIn);
  loggedInRef.current = loggedIn;

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

    const newCommUserIDs = newCommUsers.map(({ userID }) => userID);

    if (!loggedInRef.current) {
      return;
    }

    void dispatchActionPromise(
      updateRelationshipsActionTypes,
      createThreadsAndRobotextForFarcasterMutuals(newCommUserIDs),
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
    if (!loggedIn || !isActive) {
      return;
    }

    const userStoreIDs = Object.keys(userInfos);

    const { identities: userIdentities } =
      await findUserIdentities(userStoreIDs);

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

  const prevCanQueryHandleCurrentUserFIDRef = React.useRef<?boolean>();
  const canQueryHandleCurrentUserFID = isActive && loggedIn;

  const [fidLoaded, setFIDLoaded] = React.useState(false);

  const handleCurrentUserFID = React.useCallback(async () => {
    if (
      canQueryHandleCurrentUserFID ===
      prevCanQueryHandleCurrentUserFIDRef.current
    ) {
      return;
    }
    prevCanQueryHandleCurrentUserFIDRef.current = canQueryHandleCurrentUserFID;

    if (!canQueryHandleCurrentUserFID || !currentUserID || !neynarClient) {
      return;
    }

    const { identities: userIdentities } = await findUserIdentities([
      currentUserID,
    ]);
    const identityFID = userIdentities[currentUserID]?.farcasterID;
    const identityFIDRequestTimedOut = identityFID
      ? false
      : getCachedUserIdentity(currentUserID) === undefined;

    if (fid && !identityFIDRequestTimedOut && fid !== identityFID) {
      await unlinkFID();
      return;
    } else if (fid) {
      const isCurrentUserFIDValid =
        await neynarClient.checkIfCurrentUserFIDIsValid(fid);
      if (!isCurrentUserFIDValid) {
        await unlinkFID();
      }
      return;
    }

    if (identityFID) {
      dispatch({
        type: setSyncedMetadataEntryActionType,
        payload: {
          name: syncedMetadataNames.CURRENT_USER_FID,
          data: identityFID,
        },
      });
    }

    setFIDLoaded(true);
  }, [
    canQueryHandleCurrentUserFID,
    findUserIdentities,
    currentUserID,
    neynarClient,
    fid,
    unlinkFID,
    dispatch,
    getCachedUserIdentity,
  ]);

  React.useEffect(() => {
    if (!usingCommServicesAccessToken) {
      return;
    }

    void handleFarcasterMutuals();
    void handleUserStoreFIDs();
    void handleCurrentUserFID();
  }, [handleCurrentUserFID, handleFarcasterMutuals, handleUserStoreFIDs]);

  React.useEffect(() => {
    if (loggedIn) {
      return;
    }

    setFIDLoaded(false);
  }, [loggedIn]);

  const farcasterDataHandler = React.useMemo(() => {
    if (!fidLoaded) {
      return null;
    }

    return children;
  }, [children, fidLoaded]);

  return farcasterDataHandler;
}

export { FarcasterDataHandler };
