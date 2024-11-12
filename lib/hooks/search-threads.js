// @flow

import * as React from 'react';

import { useSidebarInfos } from './sidebar-hooks.js';
import {
  type ChatThreadItem,
  useFilteredChatListData,
} from '../selectors/chat-selectors.js';
import { useThreadSearchIndex } from '../selectors/nav-selectors.js';
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

function useSearchThreads<U: SidebarInfo | ChatThreadItem>(
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
): SearchThreadsResult<SidebarInfo> {
  const sidebarsByParentID = useSidebarInfos();
  const childThreadInfos = sidebarsByParentID[threadInfo.id] ?? emptyArray;
  return useSearchThreads(threadInfo, childThreadInfos);
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
