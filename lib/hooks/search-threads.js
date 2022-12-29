// @flow

import * as React from 'react';

import {
  type ChatThreadItem,
  useFilteredChatListData,
} from '../selectors/chat-selectors';
import { sidebarInfoSelector } from '../selectors/thread-selectors';
import SearchIndex from '../shared/search-index';
import { threadIsChannel, threadSearchText } from '../shared/thread-utils';
import type { SetState } from '../types/hook-types';
import type {
  SidebarInfo,
  ThreadInfo,
  RawThreadInfo,
} from '../types/thread-types';
import { useSelector } from '../utils/redux-utils';

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

  const userInfos = useSelector(state => state.userStore.userInfos);

  const listData = React.useMemo(() => {
    if (!searchState.text) {
      return childThreadInfos;
    }
    return childThreadInfos.filter(thread =>
      searchState.results.has(thread.threadInfo.id),
    );
  }, [childThreadInfos, searchState]);

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const searchIndex = React.useMemo(() => {
    const index = new SearchIndex();
    for (const thread of childThreadInfos) {
      const threadInfoFromItem = thread.threadInfo;
      index.addEntry(
        threadInfoFromItem.id,
        threadSearchText(threadInfoFromItem, userInfos, viewerID),
      );
    }
    return index;
  }, [childThreadInfos, userInfos, viewerID]);

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
