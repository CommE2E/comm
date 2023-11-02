// @flow

import * as React from 'react';

import genesis from '../facts/genesis.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import SentencePrefixSearchIndex from '../shared/sentence-prefix-search-index.js';
import type {
  MinimallyEncodedResolvedThreadInfo,
  MinimallyEncodedThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import type {
  ChatMentionCandidates,
  ChatMentionCandidatesObj,
  ResolvedThreadInfo,
  ThreadInfo,
} from '../types/thread-types.js';
import { useResolvedThreadInfosObj } from '../utils/entity-helpers.js';
import { useSelector } from '../utils/redux-utils.js';

type Props = {
  +children: React.Node,
};
export type ChatMentionContextType = {
  +getChatMentionSearchIndex: (
    threadInfo: ThreadInfo | MinimallyEncodedThreadInfo,
  ) => SentencePrefixSearchIndex,
  +communityThreadIDForGenesisThreads: { +[id: string]: string },
  +chatMentionCandidatesObj: ChatMentionCandidatesObj,
};

const emptySearchIndex = new SentencePrefixSearchIndex();
const ChatMentionContext: React.Context<?ChatMentionContextType> =
  React.createContext<?ChatMentionContextType>({
    getChatMentionSearchIndex: () => emptySearchIndex,
    communityThreadIDForGenesisThreads: {},
    chatMentionCandidatesObj: {},
  });

function ChatMentionContextProvider(props: Props): React.Node {
  const { children } = props;

  const { communityThreadIDForGenesisThreads, chatMentionCandidatesObj } =
    useChatMentionCandidatesObjAndUtils();
  const searchIndices = useChatMentionSearchIndex(chatMentionCandidatesObj);

  const getChatMentionSearchIndex = React.useCallback(
    (threadInfo: ThreadInfo | MinimallyEncodedThreadInfo) => {
      if (threadInfo.community === genesis.id) {
        return searchIndices[communityThreadIDForGenesisThreads[threadInfo.id]];
      }
      return searchIndices[threadInfo.community ?? threadInfo.id];
    },
    [communityThreadIDForGenesisThreads, searchIndices],
  );

  const value = React.useMemo(
    () => ({
      getChatMentionSearchIndex,
      communityThreadIDForGenesisThreads,
      chatMentionCandidatesObj,
    }),
    [
      getChatMentionSearchIndex,
      communityThreadIDForGenesisThreads,
      chatMentionCandidatesObj,
    ],
  );

  return (
    <ChatMentionContext.Provider value={value}>
      {children}
    </ChatMentionContext.Provider>
  );
}

function getChatMentionCandidates(threadInfos: {
  +[id: string]: ResolvedThreadInfo | MinimallyEncodedResolvedThreadInfo,
}): {
  chatMentionCandidatesObj: ChatMentionCandidatesObj,
  communityThreadIDForGenesisThreads: { +[id: string]: string },
} {
  const result: { [string]: { [string]: ResolvedThreadInfo } } = {};
  const visitedGenesisThreads = new Set<string>();
  const communityThreadIDForGenesisThreads: { [string]: string } = {};
  for (const currentThreadID in threadInfos) {
    const currentThreadInfo = threadInfos[currentThreadID];
    const { community: currentThreadCommunity } = currentThreadInfo;
    if (!currentThreadCommunity) {
      if (!result[currentThreadID]) {
        result[currentThreadID] = { [currentThreadID]: currentThreadInfo };
      }
      continue;
    }
    if (!result[currentThreadCommunity]) {
      result[currentThreadCommunity] = {};
      result[currentThreadCommunity][currentThreadCommunity] =
        threadInfos[currentThreadCommunity];
    }
    // Handle GENESIS community case: mentioning inside GENESIS should only
    // show chats and threads inside the top level that is below GENESIS.
    if (threadInfos[currentThreadCommunity].type === threadTypes.GENESIS) {
      if (visitedGenesisThreads.has(currentThreadID)) {
        continue;
      }
      const threadTraversePath = [currentThreadInfo];
      visitedGenesisThreads.add(currentThreadID);
      let currentlySelectedThreadID = currentThreadInfo.parentThreadID;
      while (currentlySelectedThreadID) {
        const currentlySelectedThreadInfo =
          threadInfos[currentlySelectedThreadID];
        if (
          visitedGenesisThreads.has(currentlySelectedThreadID) ||
          !currentlySelectedThreadInfo ||
          currentlySelectedThreadInfo.type === threadTypes.GENESIS
        ) {
          break;
        }
        threadTraversePath.push(currentlySelectedThreadInfo);
        visitedGenesisThreads.add(currentlySelectedThreadID);
        currentlySelectedThreadID = currentlySelectedThreadInfo.parentThreadID;
      }
      const lastThreadInTraversePath =
        threadTraversePath[threadTraversePath.length - 1];
      let lastThreadInTraversePathParentID;
      if (lastThreadInTraversePath.parentThreadID) {
        lastThreadInTraversePathParentID = threadInfos[
          lastThreadInTraversePath.parentThreadID
        ]
          ? lastThreadInTraversePath.parentThreadID
          : lastThreadInTraversePath.id;
      } else {
        lastThreadInTraversePathParentID = lastThreadInTraversePath.id;
      }
      if (
        threadInfos[lastThreadInTraversePathParentID].type ===
        threadTypes.GENESIS
      ) {
        if (!result[lastThreadInTraversePath.id]) {
          result[lastThreadInTraversePath.id] = {};
        }
        for (const threadInfo of threadTraversePath) {
          result[lastThreadInTraversePath.id][threadInfo.id] = threadInfo;
          communityThreadIDForGenesisThreads[threadInfo.id] =
            lastThreadInTraversePath.id;
        }
        if (
          lastThreadInTraversePath.type !== threadTypes.PERSONAL &&
          lastThreadInTraversePath.type !== threadTypes.PRIVATE
        ) {
          result[genesis.id][lastThreadInTraversePath.id] =
            lastThreadInTraversePath;
        }
      } else {
        if (
          !communityThreadIDForGenesisThreads[lastThreadInTraversePathParentID]
        ) {
          result[lastThreadInTraversePathParentID] = {};
          communityThreadIDForGenesisThreads[lastThreadInTraversePathParentID] =
            lastThreadInTraversePathParentID;
        }
        const lastThreadInTraversePathParentCommunityThreadID =
          communityThreadIDForGenesisThreads[lastThreadInTraversePathParentID];
        for (const threadInfo of threadTraversePath) {
          result[lastThreadInTraversePathParentCommunityThreadID][
            threadInfo.id
          ] = threadInfo;
          communityThreadIDForGenesisThreads[threadInfo.id] =
            lastThreadInTraversePathParentCommunityThreadID;
        }
      }
      continue;
    }
    result[currentThreadCommunity][currentThreadID] = currentThreadInfo;
  }
  return {
    chatMentionCandidatesObj: result,
    communityThreadIDForGenesisThreads,
  };
}

// Without allAtOnce, useChatMentionCandidatesObjAndUtils is very expensive.
// useResolvedThreadInfosObj would trigger its recalculation for each ENS name
// as it streams in, but we would prefer to trigger its recaculation just once
// for every update of the underlying Redux data.
const useResolvedThreadInfosObjOptions = { allAtOnce: true };

function useChatMentionCandidatesObjAndUtils(): {
  chatMentionCandidatesObj: ChatMentionCandidatesObj,
  resolvedThreadInfos: ChatMentionCandidates,
  communityThreadIDForGenesisThreads: { +[id: string]: string },
} {
  const threadInfos = useSelector(threadInfoSelector);
  const resolvedThreadInfos = useResolvedThreadInfosObj(
    threadInfos,
    useResolvedThreadInfosObjOptions,
  );
  const { chatMentionCandidatesObj, communityThreadIDForGenesisThreads } =
    React.useMemo(
      () => getChatMentionCandidates(resolvedThreadInfos),
      [resolvedThreadInfos],
    );
  return {
    chatMentionCandidatesObj,
    resolvedThreadInfos,
    communityThreadIDForGenesisThreads,
  };
}

function useChatMentionSearchIndex(
  chatMentionCandidatesObj: ChatMentionCandidatesObj,
): {
  +[id: string]: SentencePrefixSearchIndex,
} {
  return React.useMemo(() => {
    const result: { [string]: SentencePrefixSearchIndex } = {};
    for (const communityThreadID in chatMentionCandidatesObj) {
      const searchIndex = new SentencePrefixSearchIndex();
      const searchIndexEntries = [];
      for (const threadID in chatMentionCandidatesObj[communityThreadID]) {
        searchIndexEntries.push({
          id: threadID,
          uiName: chatMentionCandidatesObj[communityThreadID][threadID].uiName,
        });
      }
      // Sort the keys so that the order of the search result is consistent
      searchIndexEntries.sort(({ uiName: uiNameA }, { uiName: uiNameB }) =>
        uiNameA.localeCompare(uiNameB),
      );
      for (const { id, uiName } of searchIndexEntries) {
        searchIndex.addEntry(id, uiName);
      }
      result[communityThreadID] = searchIndex;
    }
    return result;
  }, [chatMentionCandidatesObj]);
}

export { ChatMentionContextProvider, ChatMentionContext };
