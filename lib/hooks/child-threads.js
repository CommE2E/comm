// @flow

import * as React from 'react';

import {
  fetchSingleMostRecentMessagesFromThreads,
  fetchSingleMostRecentMessagesFromThreadsActionTypes,
} from '../actions/message-actions';
import {
  useFilteredChatListData,
  type ChatThreadItem,
} from '../selectors/chat-selectors';
import { useGlobalThreadSearchIndex } from '../selectors/nav-selectors';
import { childThreadInfos } from '../selectors/thread-selectors';
import { threadInChatList } from '../shared/thread-utils';
import threadWatcher from '../shared/thread-watcher';
import type { ThreadInfo } from '../types/thread-types';
import { useDispatchActionPromise, useServerCall } from '../utils/action-utils';
import { useSelector } from '../utils/redux-utils';

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
      return new Set();
    }
    return new Set(
      childThreads.filter(predicate).map(threadInfo => threadInfo.id),
    );
  }, [childThreads, predicate]);

  const filterSubchannels = React.useCallback(
    thread => subchannelIDs.has(thread?.id),
    [subchannelIDs],
  );
  const allSubchannelsList = useFilteredChatListData(filterSubchannels);

  const searchIndex = useGlobalThreadSearchIndex();

  const searchResultIDs = React.useMemo(
    () => searchIndex.getSearchResults(searchText),
    [searchIndex, searchText],
  );

  const searchTextExists = !!searchText.length;

  const subchannelIDsNotInChatList = React.useMemo(
    () =>
      new Set(
        allSubchannelsList
          .filter(item => !threadInChatList(item.threadInfo))
          .map(item => item.threadInfo.id),
      ),
    [allSubchannelsList],
  );

  React.useEffect(() => {
    if (!subchannelIDsNotInChatList.size) {
      return;
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

  const threadIDsWithNoMessages = React.useMemo(
    () =>
      new Set(
        filteredSubchannelsChatList
          .filter(item => !item.mostRecentMessageInfo)
          .map(item => item.threadInfo.id),
      ),
    [filteredSubchannelsChatList],
  );
  const dispatchActionPromise = useDispatchActionPromise();
  const fetchSingleMostRecentMessages = useServerCall(
    fetchSingleMostRecentMessagesFromThreads,
  );

  React.useEffect(() => {
    if (!threadIDsWithNoMessages.size) {
      return;
    }
    dispatchActionPromise(
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
