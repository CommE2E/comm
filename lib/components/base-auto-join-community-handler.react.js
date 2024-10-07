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
import sleep from '../utils/sleep.js';

type JoinStatus = 'inactive' | 'joining' | 'joined';

type CommunityToAutoJoin = {
  +batch: number,
  +communityID: string,
  +keyserverOverride: ?KeyserverOverride,
  +joinStatus: JoinStatus,
};

type CommunityDatas = {
  +[communityID: string]: CommunityToAutoJoin,
};

type CommunitiesToAutoJoin = {
  +curBatch: number,
  +communityDatas: CommunityDatas,
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

  const [communitiesToAutoJoin, baseSetCommunitiesToAutoJoin] =
    React.useState<?CommunitiesToAutoJoin>();

  const prevCanQueryRef = React.useRef<?boolean>();
  const canQuery = loggedIn && !!fid;

  React.useEffect(() => {
    if (canQuery === prevCanQueryRef.current) {
      return;
    }

    prevCanQueryRef.current = canQuery;
    if (!canQuery || !isActive || !fid || !neynarClient) {
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

      const promises: {
        [string]: Promise<?$Diff<CommunityToAutoJoin, { +batch: number }>>,
      } = {};

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

      const communityDatas: { ...CommunityDatas } = {};

      let i = 0;
      for (const key in filteredCommunitiesObj) {
        const communityObject = filteredCommunitiesObj[key];
        const communityID = communityObject.communityID;
        communityDatas[communityID] = {
          ...communityObject,
          batch: Math.floor(i++ / 5),
        };
      }

      baseSetCommunitiesToAutoJoin({ communityDatas, curBatch: 0 });
    })();
  }, [
    threadInfos,
    fid,
    isActive,
    neynarClient,
    getAuthMetadata,
    keyserverInfos,
    canQuery,
  ]);

  const potentiallyIncrementBatch: (
    ?CommunitiesToAutoJoin,
  ) => ?CommunitiesToAutoJoin = React.useCallback(input => {
    if (!input) {
      return input;
    }

    let shouldIncrementBatch = false;
    const { curBatch, communityDatas } = input;
    for (const communityToAutoJoin of Object.values(communityDatas)) {
      const { batch, joinStatus } = communityToAutoJoin;

      if (batch !== curBatch) {
        continue;
      }

      if (joinStatus !== 'joined') {
        // One of the current batch isn't complete yet
        return input;
      }

      // We have at least one complete in the current batch
      shouldIncrementBatch = true;
    }

    // If we get here, all of the current batch is complete
    if (shouldIncrementBatch) {
      return { communityDatas, curBatch: curBatch + 1 };
    }

    return input;
  }, []);

  const setCommunitiesToAutoJoin: SetState<?CommunitiesToAutoJoin> =
    React.useCallback(
      next => {
        if (typeof next !== 'function') {
          baseSetCommunitiesToAutoJoin(potentiallyIncrementBatch(next));
          return;
        }
        baseSetCommunitiesToAutoJoin(prev => {
          const result = next(prev);
          return potentiallyIncrementBatch(result);
        });
      },
      [potentiallyIncrementBatch],
    );

  const joinHandlers = React.useMemo(() => {
    if (!communitiesToAutoJoin) {
      return null;
    }

    const { curBatch, communityDatas } = communitiesToAutoJoin;

    return Object.values(communityDatas).map(communityData => {
      const { batch, communityID, keyserverOverride, joinStatus } =
        communityData;

      if (batch !== curBatch || joinStatus === 'joined') {
        return null;
      }

      return (
        <JoinHandler
          key={communityID}
          communityID={communityID}
          keyserverOverride={keyserverOverride}
          calendarQuery={calendarQuery}
          joinStatus={joinStatus}
          setCommunitiesToAutoJoin={setCommunitiesToAutoJoin}
        />
      );
    });
  }, [calendarQuery, communitiesToAutoJoin, setCommunitiesToAutoJoin]);

  return joinHandlers;
}

type JoinHandlerProps = {
  +communityID: string,
  +keyserverOverride: ?KeyserverOverride,
  +calendarQuery: () => CalendarQuery,
  +joinStatus: JoinStatus,
  +setCommunitiesToAutoJoin: SetState<?CommunitiesToAutoJoin>,
};

function JoinHandler(props: JoinHandlerProps) {
  const {
    communityID,
    keyserverOverride,
    calendarQuery,
    joinStatus,
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

  const setJoinStatus = React.useCallback(
    (newJoinStatus: JoinStatus) => {
      setCommunitiesToAutoJoin(prev => {
        if (!prev) {
          return null;
        }

        return {
          ...prev,
          communityDatas: {
            ...prev.communityDatas,
            [communityID]: {
              ...prev.communityDatas[communityID],
              joinStatus: newJoinStatus,
            },
          },
        };
      });
    },
    [communityID, setCommunitiesToAutoJoin],
  );

  React.useEffect(() => {
    if (joinStatus !== 'inactive') {
      return;
    }
    void (async () => {
      try {
        setJoinStatus('joining');
        await sleep(1000);
        await joinCommunity();
      } finally {
        setJoinStatus('joined');
      }
    })();
  }, [joinStatus, communityID, setJoinStatus, joinCommunity]);

  return null;
}

export { BaseAutoJoinCommunityHandler };
