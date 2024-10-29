// @flow

import * as React from 'react';

import {
  fetchSingleMostRecentMessagesFromThreadsActionTypes,
  useFetchSingleMostRecentMessagesFromThreads,
} from '../actions/message-actions.js';
import {
  type ChatThreadItem,
  useFilteredChatListData,
} from '../selectors/chat-selectors.js';
import { useGlobalThreadSearchIndex } from '../selectors/nav-selectors.js';
import { childThreadInfos } from '../selectors/thread-selectors.js';
import { useThreadsInChatList } from '../shared/thread-utils.js';
import threadWatcher from '../shared/thread-watcher.js';
import type {
  ThreadInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

type ThreadFilter = {
  +predicate?: (thread: ThreadInfo) => boolean,
  +searchText?: string,
};

function useFilteredChildThreads(
  threadID: string,
  filter?: ThreadFilter,
): $ReadOnlyArray<ChatThreadItem> {
  const defaultPredicate = React.useCallback(() => true, []);
  const { predicate = defaultPredicate, searchText = '' } = filter ?? {};
  const childThreads = useSelector(state => childThreadInfos(state)[threadID]);
  const subchannelIDs = React.useMemo(() => {
    if (!childThreads) {
      return new Set<string>();
    }
    return new Set<string>(
      childThreads.filter(predicate).map(threadInfo => threadInfo.id),
    );
  }, [childThreads, predicate]);

  const filterSubchannels = React.useCallback(
    (thread: ?(RawThreadInfo | ThreadInfo)) => {
      const candidateThreadID = thread?.id;
      if (!candidateThreadID) {
        return false;
      }
      return subchannelIDs.has(candidateThreadID);
    },
    [subchannelIDs],
  );
  const allSubchannelsList = useFilteredChatListData(filterSubchannels);

  const searchIndex = useGlobalThreadSearchIndex();

  const searchResultIDs = React.useMemo(
    () => searchIndex.getSearchResults(searchText),
    [searchIndex, searchText],
  );

  const searchTextExists = !!searchText.length;

  const subchannelsThreadInfos = React.useMemo(
    () => allSubchannelsList.map(item => item.threadInfo),
    [allSubchannelsList],
  );
  const subchannelsInChatList = useThreadsInChatList(subchannelsThreadInfos);
  const subchannelIDsInChatList = React.useMemo(
    () => new Set(subchannelsInChatList.map(thread => thread.id)),
    [subchannelsInChatList],
  );

  const subchannelIDsNotInChatList = React.useMemo(
    () =>
      new Set(
        allSubchannelsList
          .filter(item => !subchannelIDsInChatList.has(item.threadInfo.id))
          .map(item => item.threadInfo.id),
      ),
    [allSubchannelsList, subchannelIDsInChatList],
  );

  React.useEffect(() => {
    if (!subchannelIDsNotInChatList.size) {
      return undefined;
    }
    subchannelIDsNotInChatList.forEach(tID => threadWatcher.watchID(tID));

    return () =>
      subchannelIDsNotInChatList.forEach(tID => threadWatcher.removeID(tID));
  }, [subchannelIDsNotInChatList]);

  const filteredSubchannelsChatList = React.useMemo(() => {
    if (!searchTextExists) {
      return allSubchannelsList;
    }
    return allSubchannelsList.filter(item =>
      searchResultIDs.includes(item.threadInfo.id),
    );
  }, [allSubchannelsList, searchResultIDs, searchTextExists]);

  const messageStore = useSelector(state => state.messageStore);
  const threadIDsWithNoMessages = React.useMemo(
    () =>
      new Set(
        filteredSubchannelsChatList
          .map(item => item.threadInfo.id)
          .filter(id => messageStore.threads[id]?.messageIDs.length === 0),
      ),
    [filteredSubchannelsChatList, messageStore],
  );
  const dispatchActionPromise = useDispatchActionPromise();
  const fetchSingleMostRecentMessages =
    useFetchSingleMostRecentMessagesFromThreads();

  React.useEffect(() => {
    if (!threadIDsWithNoMessages.size) {
      return;
    }
    void dispatchActionPromise(
      fetchSingleMostRecentMessagesFromThreadsActionTypes,
      fetchSingleMostRecentMessages(Array.from(threadIDsWithNoMessages)),
    );
  }, [
    threadIDsWithNoMessages,
    fetchSingleMostRecentMessages,
    dispatchActionPromise,
  ]);

  return filteredSubchannelsChatList;
}

export { useFilteredChildThreads };
