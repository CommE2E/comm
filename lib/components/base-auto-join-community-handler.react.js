// @flow

import invariant from 'invariant';
import _pickBy from 'lodash/fp/pickBy.js';
import * as React from 'react';

import { NeynarClientContext } from '../components/neynar-client-provider.react.js';
import blobService from '../facts/blob-service.js';
import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from '../hooks/account-hooks.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
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
import type { SetState } from '../types/hook-types.js';
import { defaultThreadSubscription } from '../types/subscription-types.js';
import { getBlobFetchableURL } from '../utils/blob-service.js';
import { useCurrentUserFID } from '../utils/farcaster-utils.js';
import { promiseAll } from '../utils/promises.js';
import { useSelector } from '../utils/redux-utils.js';
import {
  usingCommServicesAccessToken,
  createDefaultHTTPRequestHeaders,
} from '../utils/services-utils.js';

type CommunityToAutoJoin = {
  +communityID: string,
  +keyserverOverride: ?KeyserverOverride,
  +joinStatus: 'inactive' | 'joining' | 'joined',
};

type CommunitiesToAutoJoin = {
  +[communityID: string]: CommunityToAutoJoin,
};

type Props = {
  +calendarQuery: () => CalendarQuery,
};

function BaseAutoJoinCommunityHandler(props: Props): React.Node {
  const { calendarQuery } = props;

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
    React.useState<?CommunitiesToAutoJoin>();

  const prevCanQueryRef = React.useRef<?boolean>();
  const canQuery = loggedIn;

  React.useEffect(() => {
    if (canQuery === prevCanQueryRef.current) {
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
            joinStatus: 'inactive',
          };
        })();
      }

      const communitiesObj = await promiseAll(promises);

      const filteredCommunitiesObj = _pickBy(Boolean)(communitiesObj);

      const communitesToJoin: { ...CommunitiesToAutoJoin } = {};

      for (const key in filteredCommunitiesObj) {
        const communityID = filteredCommunitiesObj[key].communityID;
        communitesToJoin[communityID] = filteredCommunitiesObj[key];
      }

      setCommunitiesToAutoJoin(communitesToJoin);
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

  const joinHandlers = React.useMemo(() => {
    if (!communitiesToAutoJoin) {
      return null;
    }

    return Object.keys(communitiesToAutoJoin).map(id => {
      const communityToAutoJoin = communitiesToAutoJoin[id];

      const { communityID, keyserverOverride, joinStatus } =
        communityToAutoJoin;

      if (joinStatus === 'joined') {
        return null;
      }

      return (
        <JoinHandler
          key={communityID}
          communityID={communityID}
          keyserverOverride={keyserverOverride}
          calendarQuery={calendarQuery}
          communitiesToAutoJoin={communitiesToAutoJoin}
          setCommunitiesToAutoJoin={setCommunitiesToAutoJoin}
        />
      );
    });
  }, [calendarQuery, communitiesToAutoJoin]);

  return joinHandlers;
}

type JoinHandlerProps = {
  +communityID: string,
  +keyserverOverride: ?KeyserverOverride,
  +calendarQuery: () => CalendarQuery,
  +communitiesToAutoJoin: CommunitiesToAutoJoin,
  +setCommunitiesToAutoJoin: SetState<?CommunitiesToAutoJoin>,
};

function JoinHandler(props: JoinHandlerProps) {
  const {
    communityID,
    keyserverOverride,
    calendarQuery,
    communitiesToAutoJoin,
    setCommunitiesToAutoJoin,
  } = props;

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
    const joinStatus = communitiesToAutoJoin[communityID]?.joinStatus;
    if (joinStatus !== 'inactive') {
      return;
    }

    void joinCommunity();
  }, [
    communitiesToAutoJoin,
    communityID,
    joinCommunity,
    setCommunitiesToAutoJoin,
  ]);

  React.useEffect(() => {
    if (step !== 'add_keyserver') {
      return;
    }

    setCommunitiesToAutoJoin(prev => {
      if (!prev) {
        return null;
      }

      return {
        ...prev,
        [communityID]: {
          ...prev[communityID],
          joinStatus: 'joining',
        },
      };
    });
  }, [communityID, setCommunitiesToAutoJoin, step]);

  React.useEffect(() => {
    if (step !== 'finished') {
      return;
    }

    setCommunitiesToAutoJoin(prev => {
      if (!prev) {
        return null;
      }

      return {
        ...prev,
        [communityID]: {
          ...prev[communityID],
          joinStatus: 'joined',
        },
      };
    });
  }, [communityID, step, setCommunitiesToAutoJoin]);

  return null;
}

export { BaseAutoJoinCommunityHandler };
