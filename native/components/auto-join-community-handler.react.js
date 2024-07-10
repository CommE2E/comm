// @flow

import invariant from 'invariant';
import _pickBy from 'lodash/fp/pickBy.js';
import * as React from 'react';

import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import blobService from 'lib/facts/blob-service.js';
import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from 'lib/hooks/account-hooks.js';
import { extractKeyserverIDFromID } from 'lib/keyserver-conn/keyserver-call-utils.js';
import {
  farcasterChannelTagBlobHash,
  useJoinCommunity,
} from 'lib/shared/community-utils.js';
import type { AuthMetadata } from 'lib/shared/identity-client-context.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type { KeyserverOverride } from 'lib/shared/invite-links.js';
import type {
  OngoingJoinCommunityData,
  JoinCommunityStep,
} from 'lib/types/community-types.js';
import { defaultThreadSubscription } from 'lib/types/subscription-types.js';
import { getBlobFetchableURL } from 'lib/utils/blob-service.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';
import { values } from 'lib/utils/objects.js';
import { promiseAll } from 'lib/utils/promises.js';
import {
  usingCommServicesAccessToken,
  createDefaultHTTPRequestHeaders,
} from 'lib/utils/services-utils.js';

import { nonThreadCalendarQuery } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';

type CommunityToAutoJoin = {
  +communityID: string,
  +keyserverOverride: ?KeyserverOverride,
};

function AutoJoinCommunityHandler(): React.Node {
  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();

  const fid = useCurrentUserFID();

  const neynarClient = React.useContext(NeynarClientContext)?.client;

  const identityClientContext = React.useContext(IdentityClientContext);
  invariant(identityClientContext, 'IdentityClientContext should be set');
  const { getAuthMetadata } = identityClientContext;

  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  const keyserverInfos = useSelector(
    state => state.keyserverStore.keyserverInfos,
  );

  const [communitiesToAutoJoin, setCommunitiesToAutoJoin] =
    React.useState<?$ReadOnlyArray<CommunityToAutoJoin>>();

  const prevCanQueryRef = React.useRef<?boolean>();
  const canQuery = loggedIn;

  React.useEffect(() => {
    if (canQuery === prevCanQueryRef.current) {
      setCommunitiesToAutoJoin(null);
      return;
    }

    prevCanQueryRef.current = canQuery;

    if (!loggedIn || !isActive || !fid || !neynarClient || !threadInfos) {
      return;
    }

    void (async () => {
      const authMetadataPromise: Promise<?AuthMetadata> = (async () => {
        if (!usingCommServicesAccessToken) {
          return undefined;
        }
        return await getAuthMetadata();
      })();

      const followedFarcasterChannelsPromise =
        neynarClient.fetchFollowedFarcasterChannels(fid);

      const [authMetadata, followedFarcasterChannels] = await Promise.all([
        authMetadataPromise,
        followedFarcasterChannelsPromise,
      ]);

      const headers = authMetadata
        ? createDefaultHTTPRequestHeaders(authMetadata)
        : {};

      const followedFarcasterChannelIDs = followedFarcasterChannels.map(
        channel => channel.id,
      );

      const promises: { [string]: Promise<?CommunityToAutoJoin> } = {};

      for (const channelID of followedFarcasterChannelIDs) {
        promises[channelID] = (async () => {
          const blobHash = farcasterChannelTagBlobHash(channelID);
          const blobURL = getBlobFetchableURL(blobHash);

          const blobResult = await fetch(blobURL, {
            method: blobService.httpEndpoints.GET_BLOB.method,
            headers,
          });

          if (blobResult.status !== 200) {
            return null;
          }

          const { commCommunityID, keyserverURL } = await blobResult.json();
          const keyserverID = extractKeyserverIDFromID(commCommunityID);

          // The user is already in the community
          if (threadInfos[commCommunityID]) {
            return null;
          }

          const keyserverOverride = !keyserverInfos[keyserverID]
            ? {
                keyserverID,
                keyserverURL: keyserverURL.replace(/\/$/, ''),
              }
            : null;

          return {
            communityID: commCommunityID,
            keyserverOverride,
          };
        })();
      }

      const communitiesObj = await promiseAll(promises);

      const filteredCommunitiesObj = _pickBy(Boolean)(communitiesObj);

      const communities = values(filteredCommunitiesObj);

      if (communities.length === 0) {
        return;
      }

      setCommunitiesToAutoJoin(communities);
    })();
  }, [
    threadInfos,
    fid,
    isActive,
    loggedIn,
    neynarClient,
    getAuthMetadata,
    keyserverInfos,
    canQuery,
  ]);

  const joinHandlers = React.useMemo(
    () =>
      communitiesToAutoJoin?.map(communityToAutoJoin => (
        <JoinHandler
          key={communityToAutoJoin.communityID}
          communityID={communityToAutoJoin.communityID}
          keyserverOverride={communityToAutoJoin.keyserverOverride}
        />
      )),
    [communitiesToAutoJoin],
  );

  return joinHandlers;
}

type JoinHandlerProps = {
  +communityID: string,
  +keyserverOverride: ?KeyserverOverride,
};
function JoinHandler(props: JoinHandlerProps) {
  const { communityID, keyserverOverride } = props;

  const navContext = React.useContext(NavContext);

  const calendarQuery = useSelector(state =>
    nonThreadCalendarQuery({
      redux: state,
      navContext,
    }),
  );

  const [ongoingJoinData, setOngoingJoinData] =
    React.useState<?OngoingJoinCommunityData>(null);

  const [step, setStep] = React.useState<JoinCommunityStep>('inactive');

  const joinCommunity = useJoinCommunity({
    communityID,
    keyserverOverride,
    calendarQuery,
    ongoingJoinData,
    setOngoingJoinData,
    step,
    setStep,
    defaultSubscription: defaultThreadSubscription,
  });

  React.useEffect(() => {
    void joinCommunity();
  }, [joinCommunity]);

  return null;
}

export { AutoJoinCommunityHandler };
