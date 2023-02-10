// @flow

import * as React from 'react';

import {
  type ChatThreadItem,
  useFilteredChatListData,
} from '../selectors/chat-selectors.js';
import { useThreadSearchIndex } from '../selectors/nav-selectors.js';
import { sidebarInfoSelector } from '../selectors/thread-selectors.js';
import { threadIsChannel } from '../shared/thread-utils.js';
import type { SetState } from '../types/hook-types.js';
import type {
  SidebarInfo,
  ThreadInfo,
  RawThreadInfo,
} from '../types/thread-types.js';
import { useSelector } from '../utils/redux-utils.js';

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
  const [searchState, setSearchState] = React.useState({
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

  const searchIndex = useThreadSearchIndex(
    childThreadInfos.map(childThreadInfo => childThreadInfo.threadInfo),
  );

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

function useSearchSidebars(
  threadInfo: ThreadInfo,
): SearchThreadsResult<SidebarInfo> {
  const childThreadInfos = useSelector(
    state => sidebarInfoSelector(state)[threadInfo.id] ?? [],
  );
  return useSearchThreads(threadInfo, childThreadInfos);
}

function useSearchSubchannels(
  threadInfo: ThreadInfo,
): SearchThreadsResult<ChatThreadItem> {
  const childThreadInfos = useFilteredChatListData(
    (thread: ?(ThreadInfo | RawThreadInfo)) =>
      threadIsChannel(thread) && thread?.parentThreadID === threadInfo.id,
  );
  return useSearchThreads(threadInfo, childThreadInfos);
}

export { useSearchSubchannels, useSearchSidebars };
