// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  joinThreadActionTypes,
  useJoinThread,
} from 'lib/actions/thread-actions.js';
import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import blobService from 'lib/facts/blob-service.js';
import { extractKeyserverIDFromIDOptional } from 'lib/keyserver-conn/keyserver-call-utils.js';
import { cookieSelector } from 'lib/selectors/keyserver-selectors.js';
import { farcasterChannelTagBlobHash } from 'lib/shared/community-utils.js';
import type { AuthMetadata } from 'lib/shared/identity-client-context.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { defaultThreadSubscription } from 'lib/types/subscription-types.js';
import { authoritativeKeyserverID } from 'lib/utils/authoritative-keyserver.js';
import { getBlobFetchableURL } from 'lib/utils/blob-service.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import {
  usingCommServicesAccessToken,
  createDefaultHTTPRequestHeaders,
} from 'lib/utils/services-utils.js';

import { nonThreadCalendarQuery } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';

function AutoJoinCommunityHandler(): React.Node {
  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const cookie = useSelector(cookieSelector(authoritativeKeyserverID()));
  const hasUserCookie = !!(cookie && cookie.startsWith('user='));
  const currentUserID = useSelector(state => state.currentUserInfo?.id);
  const loggedIn = !!currentUserID && hasUserCookie;

  const fid = useCurrentUserFID();

  const neynarClient = React.useContext(NeynarClientContext)?.client;

  const navContext = React.useContext(NavContext);

  const identityClientContext = React.useContext(IdentityClientContext);
  invariant(identityClientContext, 'IdentityClientContext should be set');
  const { getAuthMetadata } = identityClientContext;

  const calendarQuery = useSelector(state =>
    nonThreadCalendarQuery({
      redux: state,
      navContext,
    }),
  );

  const joinThread = useJoinThread();

  const joinThreadActionPromise = React.useCallback(
    async (communityID: string) => {
      const query = calendarQuery();

      return await joinThread({
        threadID: communityID,
        calendarQuery: {
          startDate: query.startDate,
          endDate: query.endDate,
          filters: [
            ...query.filters,
            { type: 'threads', threadIDs: [communityID] },
          ],
        },
        defaultSubscription: defaultThreadSubscription,
      });
    },
    [calendarQuery, joinThread],
  );

  const dispatchActionPromise = useDispatchActionPromise();

  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  const keyserverInfos = useSelector(
    state => state.keyserverStore.keyserverInfos,
  );

  React.useEffect(() => {
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

      const promises = followedFarcasterChannelIDs.map(async channelID => {
        const blobHash = farcasterChannelTagBlobHash(channelID);
        const blobURL = getBlobFetchableURL(blobHash);

        const blobResult = await fetch(blobURL, {
          method: blobService.httpEndpoints.GET_BLOB.method,
          headers,
        });

        if (blobResult.status !== 200) {
          return;
        }

        const { commCommunityID } = await blobResult.json();
        const keyserverID = extractKeyserverIDFromIDOptional(commCommunityID);

        if (!keyserverID || !keyserverInfos[keyserverID]) {
          return;
        }

        // The user is already in the community
        if (threadInfos[commCommunityID]) {
          return;
        }

        void dispatchActionPromise(
          joinThreadActionTypes,
          joinThreadActionPromise(commCommunityID),
        );
      });

      await Promise.all(promises);
    })();
  }, [
    threadInfos,
    dispatchActionPromise,
    fid,
    isActive,
    joinThreadActionPromise,
    loggedIn,
    neynarClient,
    getAuthMetadata,
    keyserverInfos,
  ]);

  return null;
}

export { AutoJoinCommunityHandler };
