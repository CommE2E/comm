// @flow

import invariant from 'invariant';
import _pickBy from 'lodash/fp/pickBy.js';
import * as React from 'react';

import { NeynarClientContext } from '../components/neynar-client-provider.react.js';
import blobService from '../facts/blob-service.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { isLoggedInToIdentityAndAuthoritativeKeyserver } from '../selectors/user-selectors.js';
import {
  farcasterChannelTagBlobHash,
  useJoinCommunity,
} from '../shared/community-utils.js';
import type { AuthMetadata } from '../shared/identity-client-context.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import type { KeyserverOverride } from '../shared/invite-links.js';
import type {
  OngoingJoinCommunityData,
  JoinCommunityStep,
} from '../types/community-types.js';
import type { CalendarQuery } from '../types/entry-types.js';
import { defaultThreadSubscription } from '../types/subscription-types.js';
import { getBlobFetchableURL } from '../utils/blob-service.js';
import { useCurrentUserFID } from '../utils/farcaster-utils.js';
import { values } from '../utils/objects.js';
import { promiseAll } from '../utils/promises.js';
import { useSelector } from '../utils/redux-utils.js';
import {
  usingCommServicesAccessToken,
  createDefaultHTTPRequestHeaders,
} from '../utils/services-utils.js';

type CommunityToAutoJoin = {
  +communityID: string,
  +keyserverOverride: ?KeyserverOverride,
};

type Props = {
  +calendarQuery: () => CalendarQuery,
};
function BaseAutoJoinCommunityHandler(props: Props): React.Node {
  const { calendarQuery } = props;

  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const loggedIn = useSelector(isLoggedInToIdentityAndAuthoritativeKeyserver);

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

    console.log('running auto join effect');

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

      console.log('setting communities to auto join');
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
      communitiesToAutoJoin?.map((communityToAutoJoin, index) => (
        <JoinHandler
          key={index}
          communityID={communityToAutoJoin.communityID}
          keyserverOverride={communityToAutoJoin.keyserverOverride}
          calendarQuery={calendarQuery}
        />
      )),
    [calendarQuery, communitiesToAutoJoin],
  );

  return joinHandlers;
}

type JoinHandlerProps = {
  +communityID: string,
  +keyserverOverride: ?KeyserverOverride,
  +calendarQuery: () => CalendarQuery,
};
function JoinHandler(props: JoinHandlerProps) {
  const { communityID, keyserverOverride, calendarQuery } = props;

  const [ongoingJoinData, setOngoingJoinData] =
    React.useState<?OngoingJoinCommunityData>(null);

  const [step, setStep] = React.useState<JoinCommunityStep>('inactive');

  console.log('regenerating useJoinCommunity');

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

export { BaseAutoJoinCommunityHandler };
