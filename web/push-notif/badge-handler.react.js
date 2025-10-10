// @flow

import * as React from 'react';

import { allConnectionInfosSelector } from 'lib/selectors/keyserver-selectors.js';
import {
  thinThreadsUnreadCountSelector,
  unreadFarcasterThreadIDsSelector,
  unreadThickThreadIDsSelector,
} from 'lib/selectors/thread-selectors.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';

import {
  updateNotifsUnreadCountStorage,
  queryNotifsUnreadCountStorage,
  getNotifsUnreadThickThreadIDs,
  updateNotifsUnreadThickThreadIDsStorage,
} from './notif-crypto-utils.js';
import electron from '../electron.js';
import { useSelector } from '../redux/redux-utils.js';
import getTitle from '../title/get-title.js';

const FARCASTER_NOTIF_KEY = 'FARCASTER';

function useBadgeHandler() {
  const connection = useSelector(allConnectionInfosSelector);
  const thinThreadsUnreadCount = useSelector(thinThreadsUnreadCountSelector);

  const { socketState: tunnelbrokerSocketState } = useTunnelbroker();
  const currentUnreadThickThreadIDs = useSelector(unreadThickThreadIDsSelector);
  const unreadFarcasterThreadIDs = useSelector(
    unreadFarcasterThreadIDsSelector,
  );

  const handleUnreadThinThreadIDsInNotifsStorage =
    React.useCallback(async () => {
      const keyserverUnreadCountsToUpdate: {
        [keyserverID: string]: number,
      } = {};
      const keyserverUnreadCountsToQuery: Array<string> = [];
      for (const keyserverID in thinThreadsUnreadCount) {
        if (connection[keyserverID]?.status !== 'connected') {
          keyserverUnreadCountsToQuery.push(keyserverID);
        } else {
          keyserverUnreadCountsToUpdate[keyserverID] =
            thinThreadsUnreadCount[keyserverID];
        }
      }

      const [queriedUnreadCounts] = await Promise.all([
        queryNotifsUnreadCountStorage(keyserverUnreadCountsToQuery),
        updateNotifsUnreadCountStorage(keyserverUnreadCountsToUpdate),
      ]);

      let totalUnreadCount = 0;
      for (const keyserverID in thinThreadsUnreadCount) {
        if (queriedUnreadCounts[keyserverID]) {
          totalUnreadCount += queriedUnreadCounts[keyserverID];
        } else if (thinThreadsUnreadCount[keyserverID]) {
          totalUnreadCount += thinThreadsUnreadCount[keyserverID];
        }
      }

      return totalUnreadCount;
    }, [connection, thinThreadsUnreadCount]);

  const handleUnreadThickThreadIDsInNotifsStorage =
    React.useCallback(async () => {
      if (tunnelbrokerSocketState.isAuthorized) {
        await updateNotifsUnreadThickThreadIDsStorage({
          type: 'set',
          threadIDs: currentUnreadThickThreadIDs,
          forceWrite: true,
        });
        return currentUnreadThickThreadIDs.length;
      }
      const result = await getNotifsUnreadThickThreadIDs();
      return result.length;
    }, [currentUnreadThickThreadIDs, tunnelbrokerSocketState.isAuthorized]);

  const handleUnreadFarcasterThreadIDsInNotifsStorage =
    React.useCallback(async () => {
      if (tunnelbrokerSocketState.isAuthorized) {
        const unreadFarcasterThreads = unreadFarcasterThreadIDs.length;
        await updateNotifsUnreadCountStorage({
          FARCASTER: unreadFarcasterThreads,
        });
        return unreadFarcasterThreads;
      }
      const result = await queryNotifsUnreadCountStorage([FARCASTER_NOTIF_KEY]);
      return result[FARCASTER_NOTIF_KEY] ?? 0;
    }, [tunnelbrokerSocketState.isAuthorized, unreadFarcasterThreadIDs.length]);

  React.useEffect(() => {
    void (async () => {
      const [unreadThinThreads, unreadThickThreads, unreadFarcasterThreads] =
        await Promise.all([
          handleUnreadThinThreadIDsInNotifsStorage(),
          handleUnreadThickThreadIDsInNotifsStorage(),
          handleUnreadFarcasterThreadIDsInNotifsStorage(),
        ]);

      const totalUnreadCount =
        unreadThinThreads + unreadThickThreads + unreadFarcasterThreads;

      document.title = getTitle(totalUnreadCount);
      electron?.setBadge(totalUnreadCount === 0 ? null : totalUnreadCount);
    })();
  }, [
    tunnelbrokerSocketState,
    currentUnreadThickThreadIDs,
    thinThreadsUnreadCount,
    connection,
    unreadFarcasterThreadIDs.length,
    handleUnreadThinThreadIDsInNotifsStorage,
    handleUnreadThickThreadIDsInNotifsStorage,
    handleUnreadFarcasterThreadIDsInNotifsStorage,
  ]);
}

function BadgeHandler(): React.Node {
  useBadgeHandler();
  return null;
}

export default BadgeHandler;
