// @flow

import * as React from 'react';

import { NeynarClientContext } from './neynar-client-provider.react.js';
import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from '../hooks/account-hooks.js';
import { getCommunity } from '../shared/thread-utils.js';
import { useCurrentUserFID } from '../utils/farcaster-utils.js';
import { useSelector } from '../utils/redux-utils.js';

// We want to use the following pattern to query for Farcaster channels when
// the app starts:
// - First, if the user has an FID, query for all of the channels they follow
// - Next, regardless of whether the user has an FID, query for all of the
//   channels in the communityStore that are being used for avatars
// This pattern allows us to minimize the number of Neynar fetches to 1 or 2.
// For the second step, this component allows us to fetch in bulk, rather than
// fetching based on the pattern of ThreadAvatar component renders.
function FarcasterChannelPrefetchHandler(): React.Node {
  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();

  const fcCache = React.useContext(NeynarClientContext)?.fcCache;
  const fid = useCurrentUserFID();

  const rawThreadInfos = useSelector(state => state.threadStore.threadInfos);

  const communityInfos = useSelector(
    state => state.communityStore.communityInfos,
  );

  React.useEffect(() => {
    if (!loggedIn || !fcCache) {
      return;
    }

    if (fid) {
      void fcCache.getFollowedFarcasterChannelsForFID(fid);
    }

    const channelIDs = new Set<string>();
    for (const threadID in rawThreadInfos) {
      const threadInfo = rawThreadInfos[threadID];
      if (threadInfo.avatar?.type !== 'farcaster') {
        // For now, we only need to prefetch channel info for avatars
        continue;
      }
      const communityID = getCommunity(threadInfo);
      if (!communityID) {
        continue;
      }
      const { farcasterChannelID } = communityInfos[communityID];
      if (farcasterChannelID && !channelIDs.has(farcasterChannelID)) {
        void fcCache.getFarcasterChannelForChannelID(farcasterChannelID);
      }
    }
    // We only want this effect to run when loggedIn or fid change. Its purpose
    // is to query for this info immediately so it can be done in bulk, so we
    // don't care to rerun it when communityInfos or threadInfos change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, fid]);

  return null;
}

export { FarcasterChannelPrefetchHandler };
