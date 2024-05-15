// @flow

import * as React from 'react';

import {
  joinThreadActionTypes,
  useJoinThread,
} from 'lib/actions/thread-actions.js';
import { NeynarClientContext } from 'lib/components/neynar-client-provider.react.js';
import blobService from 'lib/facts/blob-service.js';
import { cookieSelector } from 'lib/selectors/keyserver-selectors.js';
import { farcasterChannelTagBlobHash } from 'lib/shared/community-utils.js';
import { authoritativeKeyserverID } from 'lib/utils/authoritative-keyserver.js';
import { getBlobFetchableURL } from 'lib/utils/blob-service.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

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
      });
    },
    [calendarQuery, joinThread],
  );

  const dispatchActionPromise = useDispatchActionPromise();

  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  React.useEffect(() => {
    if (!loggedIn || !isActive || !fid || !neynarClient || !threadInfos) {
      return;
    }

    void (async () => {
      const followedFarcasterChannels =
        await neynarClient.fetchFollowedFarcasterChannels(fid);

      const followedFarcasterChannelIDs = followedFarcasterChannels.map(
        channel => channel.id,
      );

      const fetchBlobPromises = followedFarcasterChannelIDs.map(channelID => {
        const blobHash = farcasterChannelTagBlobHash(channelID);
        const blobURL = getBlobFetchableURL(blobHash);

        return fetch(blobURL, {
          method: blobService.httpEndpoints.GET_BLOB.method,
        });
      });

      const fetchBlobResults = await Promise.all(fetchBlobPromises);

      const farcasterChannelTagBlobsPromises = fetchBlobResults
        .map(blobResult => {
          if (blobResult.status !== 200) {
            return null;
          }

          return blobResult.json();
        })
        .filter(Boolean);

      const farcasterChannelTagBlobs: $ReadOnlyArray<{
        +commCommunityID: string,
        +farcasterChannelID: string,
      }> = await Promise.all(farcasterChannelTagBlobsPromises);

      const joinThreadPromises = farcasterChannelTagBlobs
        .map(blob => {
          const { commCommunityID } = blob;

          const keyserverID = commCommunityID.split('|')[0];
          if (keyserverID !== authoritativeKeyserverID()) {
            return null;
          }

          // The user is already in the community
          if (threadInfos[commCommunityID]) {
            return null;
          }

          return dispatchActionPromise(
            joinThreadActionTypes,
            joinThreadActionPromise(commCommunityID),
          );
        })
        .filter(Boolean);

      await Promise.all(joinThreadPromises);
    })();
  }, [
    threadInfos,
    dispatchActionPromise,
    fid,
    isActive,
    joinThreadActionPromise,
    loggedIn,
    neynarClient,
  ]);

  return null;
}

export { AutoJoinCommunityHandler };
