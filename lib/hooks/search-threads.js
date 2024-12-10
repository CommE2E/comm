// @flow

import * as React from 'react';

import { useSidebarInfos } from './sidebar-hooks.js';
import {
  type ChatThreadItem,
  useFilteredChatListData,
} from '../selectors/chat-selectors.js';
import { useThreadSearchIndex } from '../selectors/nav-selectors.js';
import {
  type SidebarThreadItem,
  getAllInitialSidebarItems,
  getAllFinalSidebarItems,
} from '../shared/sidebar-item-utils.js';
import { threadIsChannel } from '../shared/thread-utils.js';
import type { SetState } from '../types/hook-types.js';
import type {
  ThreadInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { SidebarInfo } from '../types/thread-types.js';

export type ThreadSearchState = {
  +text: string,
  +results: $ReadOnlySet<string>,
};

type SearchThreadsResult<U> = {
  +listData: $ReadOnlyArray<U>,
  +searchState: ThreadSearchState,
  +setSearchState: SetState<ThreadSearchState>,
  +onChangeSearchInputText: (text: string) => mixed,
  +clearQuery: (event: SyntheticEvent<HTMLAnchorElement>) => void,
};

type ChildThreadInfos = {
  +threadInfo: RawThreadInfo | ThreadInfo,
  ...
};
function useSearchThreads<U: ChildThreadInfos>(
  threadInfo: ThreadInfo,
  childThreadInfos: $ReadOnlyArray<U>,
): SearchThreadsResult<U> {
  const [searchState, setSearchState] = React.useState<ThreadSearchState>({
    text: '',
    results: new Set<string>(),
  });

  const listData = React.useMemo(() => {
    if (!searchState.text) {
      return childThreadInfos;
    }
    return childThreadInfos.filter(thread =>
      searchState.results.has(thread.threadInfo.id),
    );
  }, [childThreadInfos, searchState]);

  const justThreadInfos = React.useMemo(
    () => childThreadInfos.map(childThreadInfo => childThreadInfo.threadInfo),
    [childThreadInfos],
  );
  const searchIndex = useThreadSearchIndex(justThreadInfos);

  const onChangeSearchInputText = React.useCallback(
    (text: string) => {
      setSearchState({
        text,
        results: new Set(searchIndex.getSearchResults(text)),
      });
    },
    [searchIndex, setSearchState],
  );

  const clearQuery = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      setSearchState({ text: '', results: new Set() });
    },
    [setSearchState],
  );

  return React.useMemo(
    () => ({
      listData,
      searchState,
      setSearchState,
      onChangeSearchInputText,
      clearQuery,
    }),
    [
      listData,
      setSearchState,
      searchState,
      onChangeSearchInputText,
      clearQuery,
    ],
  );
}

const emptyArray: $ReadOnlyArray<SidebarInfo> = [];

function useSearchSidebars(
  threadInfo: ThreadInfo,
): SearchThreadsResult<SidebarThreadItem> {
  const sidebarsByParentID = useSidebarInfos();
  const childThreadInfos = sidebarsByParentID[threadInfo.id] ?? emptyArray;
  const initialSidebarItems = React.useMemo(
    () => getAllInitialSidebarItems(childThreadInfos),
    [childThreadInfos],
  );
  const [sidebarItems, setSidebarItems] =
    React.useState<$ReadOnlyArray<SidebarThreadItem>>(initialSidebarItems);

  const prevChildThreadInfosRef = React.useRef(childThreadInfos);
  React.useEffect(() => {
    if (childThreadInfos === prevChildThreadInfosRef.current) {
      return;
    }
    prevChildThreadInfosRef.current = childThreadInfos;

    setSidebarItems(initialSidebarItems);

    void (async () => {
      const finalSidebarItems = await getAllFinalSidebarItems(childThreadInfos);
      if (childThreadInfos !== prevChildThreadInfosRef.current) {
        // If these aren't equal, it indicates that the effect has fired again.
        // We should discard this result as it is now outdated.
        return;
      }
      // The callback below is basically setSidebarItems(finalSidebarItems), but
      // it has extra logic to preserve objects if they are unchanged.
      setSidebarItems(prevSidebarItems => {
        if (prevSidebarItems.length !== finalSidebarItems.length) {
          console.log(
            'unexpected: prevSidebarItems.length !== finalSidebarItems.length',
          );
          return finalSidebarItems;
        }
        let somethingChanged = false;
        const result = [];
        for (let i = 0; i < prevSidebarItems.length; i++) {
          const prevSidebarItem = prevSidebarItems[i];
          const newSidebarItem = finalSidebarItems[i];
          if (prevSidebarItem.threadInfo.id !== newSidebarItem.threadInfo.id) {
            console.log(
              'unexpected: prevSidebarItem.threadInfo.id !== ' +
                'newSidebarItem.threadInfo.id',
            );
            return finalSidebarItems;
          }
          if (
            prevSidebarItem.lastUpdatedTime !== newSidebarItem.lastUpdatedTime
          ) {
            somethingChanged = true;
            result[i] = newSidebarItem;
          } else {
            result[i] = prevSidebarItem;
          }
        }
        if (somethingChanged) {
          return result;
        } else {
          return prevSidebarItems;
        }
      });
    })();
  }, [childThreadInfos, initialSidebarItems]);

  return useSearchThreads(threadInfo, sidebarItems);
}

function useSearchSubchannels(
  threadInfo: ThreadInfo,
): SearchThreadsResult<ChatThreadItem> {
  const filterFunc = React.useCallback(
    (thread: ?(ThreadInfo | RawThreadInfo)) =>
      threadIsChannel(thread) && thread?.parentThreadID === threadInfo.id,
    [threadInfo.id],
  );
  const childThreadInfos = useFilteredChatListData(filterFunc);
  return useSearchThreads(threadInfo, childThreadInfos);
}

export { useSearchSubchannels, useSearchSidebars };
