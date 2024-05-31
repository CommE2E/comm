// @flow

import * as React from 'react';

import genesis from '../facts/genesis.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import SentencePrefixSearchIndex from '../shared/sentence-prefix-search-index.js';
import { threadIsPending } from '../shared/thread-utils.js';
import type {
  ResolvedThreadInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import type {
  ChatMentionCandidate,
  ChatMentionCandidatesObj,
} from '../types/thread-types.js';
import { useResolvedThreadInfosObj } from '../utils/entity-helpers.js';
import { getNameForThreadEntity } from '../utils/entity-text.js';
import { useSelector } from '../utils/redux-utils.js';

type BaseThreadInfo = {
  +id: string,
  +containingThreadID?: ?string,
  ...
};

type Props = {
  +children: React.Node,
};
export type ChatMentionContextType = {
  +getChatMentionSearchIndex: (
    threadInfo: ThreadInfo,
  ) => ?SentencePrefixSearchIndex,
  +getCommunityThreadIDForGenesisThreads: (
    threadInfo: BaseThreadInfo,
  ) => string,
  +chatMentionCandidatesObj: ChatMentionCandidatesObj,
};

const emptySearchIndex = new SentencePrefixSearchIndex();
const ChatMentionContext: React.Context<?ChatMentionContextType> =
  React.createContext<?ChatMentionContextType>({
    getChatMentionSearchIndex: () => emptySearchIndex,
    getCommunityThreadIDForGenesisThreads: () => '',
    chatMentionCandidatesObj: {},
  });

function ChatMentionContextProvider(props: Props): React.Node {
  const { children } = props;

  const { chatMentionCandidatesObj, getCommunityThreadIDForGenesisThreads } =
    useChatMentionCandidatesObjAndUtils();
  const searchIndices = useChatMentionSearchIndex(chatMentionCandidatesObj);

  const getChatMentionSearchIndex = React.useCallback(
    (threadInfo: ThreadInfo) => {
      if (threadInfo.community === genesis().id) {
        const communityThreadID =
          getCommunityThreadIDForGenesisThreads(threadInfo);
        return searchIndices[communityThreadID];
      }
      return searchIndices[threadInfo.community ?? threadInfo.id];
    },
    [getCommunityThreadIDForGenesisThreads, searchIndices],
  );

  const value = React.useMemo(
    () => ({
      getChatMentionSearchIndex,
      getCommunityThreadIDForGenesisThreads,
      chatMentionCandidatesObj,
    }),
    [
      getChatMentionSearchIndex,
      getCommunityThreadIDForGenesisThreads,
      chatMentionCandidatesObj,
    ],
  );

  return (
    <ChatMentionContext.Provider value={value}>
      {children}
    </ChatMentionContext.Provider>
  );
}

function getChatMentionCandidates(
  threadInfos: { +[id: string]: ThreadInfo },
  resolvedThreadInfos: {
    +[id: string]: ResolvedThreadInfo,
  },
): {
  chatMentionCandidatesObj: ChatMentionCandidatesObj,
  communityThreadIDForGenesisThreads: { +[id: string]: string },
} {
  const result: {
    [string]: {
      [string]: ChatMentionCandidate,
    },
  } = {};
  const visitedGenesisThreads = new Set<string>();
  const communityThreadIDForGenesisThreads: { [string]: string } = {};
  for (const currentThreadID in resolvedThreadInfos) {
    const currentResolvedThreadInfo = resolvedThreadInfos[currentThreadID];
    const { community: currentThreadCommunity } = currentResolvedThreadInfo;
    if (!currentThreadCommunity) {
      if (!result[currentThreadID]) {
        result[currentThreadID] = {
          [currentThreadID]: {
            threadInfo: currentResolvedThreadInfo,
            rawChatName: threadInfos[currentThreadID].uiName,
          },
        };
      }
      continue;
    }
    if (!result[currentThreadCommunity]) {
      result[currentThreadCommunity] = {};
      result[currentThreadCommunity][currentThreadCommunity] = {
        threadInfo: resolvedThreadInfos[currentThreadCommunity],
        rawChatName: threadInfos[currentThreadCommunity].uiName,
      };
    }
    // Handle GENESIS community case: mentioning inside GENESIS should only
    // show chats and threads inside the top level that is below GENESIS.
    if (
      resolvedThreadInfos[currentThreadCommunity].type === threadTypes.GENESIS
    ) {
      if (visitedGenesisThreads.has(currentThreadID)) {
        continue;
      }
      const threadTraversePath = [currentResolvedThreadInfo];
      visitedGenesisThreads.add(currentThreadID);
      let currentlySelectedThreadID = currentResolvedThreadInfo.parentThreadID;
      while (currentlySelectedThreadID) {
        const currentlySelectedThreadInfo =
          resolvedThreadInfos[currentlySelectedThreadID];
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
        lastThreadInTraversePathParentID = resolvedThreadInfos[
          lastThreadInTraversePath.parentThreadID
        ]
          ? lastThreadInTraversePath.parentThreadID
          : lastThreadInTraversePath.id;
      } else {
        lastThreadInTraversePathParentID = lastThreadInTraversePath.id;
      }
      if (
        resolvedThreadInfos[lastThreadInTraversePathParentID].type ===
        threadTypes.GENESIS
      ) {
        if (!result[lastThreadInTraversePath.id]) {
          result[lastThreadInTraversePath.id] = {};
        }
        for (const threadInfo of threadTraversePath) {
          result[lastThreadInTraversePath.id][threadInfo.id] = {
            threadInfo,
            rawChatName: threadInfos[threadInfo.id].uiName,
          };
          communityThreadIDForGenesisThreads[threadInfo.id] =
            lastThreadInTraversePath.id;
        }
        if (
          lastThreadInTraversePath.type !== threadTypes.GENESIS_PERSONAL &&
          lastThreadInTraversePath.type !== threadTypes.GENESIS_PRIVATE
        ) {
          if (!result[genesis().id]) {
            result[genesis().id] = {};
          }
          result[genesis().id][lastThreadInTraversePath.id] = {
            threadInfo: lastThreadInTraversePath,
            rawChatName: threadInfos[lastThreadInTraversePath.id].uiName,
          };
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
          ] = {
            threadInfo,
            rawChatName: threadInfos[threadInfo.id].uiName,
          };
          communityThreadIDForGenesisThreads[threadInfo.id] =
            lastThreadInTraversePathParentCommunityThreadID;
        }
      }
      continue;
    }
    result[currentThreadCommunity][currentThreadID] = {
      threadInfo: currentResolvedThreadInfo,
      rawChatName: threadInfos[currentThreadID].uiName,
    };
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
  getCommunityThreadIDForGenesisThreads: (threadInfo: BaseThreadInfo) => string,
} {
  const threadInfos = useSelector(threadInfoSelector);
  const resolvedThreadInfos = useResolvedThreadInfosObj(
    threadInfos,
    useResolvedThreadInfosObjOptions,
  );
  const { chatMentionCandidatesObj, communityThreadIDForGenesisThreads } =
    React.useMemo(
      () => getChatMentionCandidates(threadInfos, resolvedThreadInfos),
      [threadInfos, resolvedThreadInfos],
    );

  const getCommunityThreadIDForGenesisThreads = React.useCallback(
    (threadInfo: BaseThreadInfo): string => {
      const threadID =
        threadIsPending(threadInfo.id) && threadInfo.containingThreadID
          ? threadInfo.containingThreadID
          : threadInfo.id;

      return communityThreadIDForGenesisThreads[threadID];
    },
    [communityThreadIDForGenesisThreads],
  );

  return {
    chatMentionCandidatesObj,
    getCommunityThreadIDForGenesisThreads,
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
          uiName:
            chatMentionCandidatesObj[communityThreadID][threadID].threadInfo
              .uiName,
          rawChatName:
            chatMentionCandidatesObj[communityThreadID][threadID].rawChatName,
        });
      }
      // Sort the keys so that the order of the search result is consistent
      searchIndexEntries.sort(({ uiName: uiNameA }, { uiName: uiNameB }) =>
        uiNameA.localeCompare(uiNameB),
      );
      for (const { id, uiName, rawChatName } of searchIndexEntries) {
        const names = [uiName];
        if (rawChatName) {
          typeof rawChatName === 'string'
            ? names.push(rawChatName)
            : names.push(getNameForThreadEntity(rawChatName));
        }

        searchIndex.addEntry(id, names.join(' '));
      }
      result[communityThreadID] = searchIndex;
    }
    return result;
  }, [chatMentionCandidatesObj]);
}

export { ChatMentionContextProvider, ChatMentionContext };
