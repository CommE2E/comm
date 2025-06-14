// @flow

import _orderBy from 'lodash/fp/orderBy.js';
import * as React from 'react';

import { useGetLastUpdatedTimes } from './thread-time.js';
import { childThreadInfos } from '../selectors/thread-selectors.js';
import { getMostRecentNonLocalMessageID } from '../shared/id-utils.js';
import { threadInChatList } from '../shared/thread-utils.js';
import { threadTypeIsSidebar } from '../shared/threads/thread-specs.js';
import type { SidebarInfo } from '../types/thread-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useSidebarInfos(): { +[id: string]: $ReadOnlyArray<SidebarInfo> } {
  const childThreadInfoByParentID = useSelector(childThreadInfos);
  const messageStore = useSelector(state => state.messageStore);
  const getLastUpdatedTimes = useGetLastUpdatedTimes();

  return React.useMemo(() => {
    const result: { [id: string]: $ReadOnlyArray<SidebarInfo> } = {};
    for (const parentID in childThreadInfoByParentID) {
      const childThreads = childThreadInfoByParentID[parentID];
      const sidebarInfos = [];
      for (const childThreadInfo of childThreads) {
        if (
          !threadInChatList(childThreadInfo) ||
          !threadTypeIsSidebar(childThreadInfo.type)
        ) {
          continue;
        }
        const {
          lastUpdatedTime,
          lastUpdatedAtLeastTime,
          lastUpdatedAtMostTime,
        } = getLastUpdatedTimes(childThreadInfo, messageStore);
        const mostRecentNonLocalMessage = getMostRecentNonLocalMessageID(
          childThreadInfo.id,
          messageStore,
        );
        sidebarInfos.push({
          threadInfo: childThreadInfo,
          lastUpdatedTime,
          lastUpdatedAtLeastTime,
          lastUpdatedAtMostTime,
          mostRecentNonLocalMessage,
        });
      }
      result[parentID] = _orderBy('lastUpdatedAtLeastTime')('desc')(
        sidebarInfos,
      );
    }
    return result;
  }, [childThreadInfoByParentID, messageStore, getLastUpdatedTimes]);
}

export { useSidebarInfos };
