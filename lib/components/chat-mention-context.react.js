// @flow

import invariant from 'invariant';
import * as React from 'react';

import genesis from '../facts/genesis.js';
import SentencePrefixSearchIndex from '../shared/sentence-prefix-search-index.js';
import {
  useChatMentionCandidatesObjAndUtils,
  useChatMentionSearchIndex,
} from '../shared/thread-utils.js';
import type {
  ChatMentionCandidates,
  ChatMentionCandidatesObj,
  ThreadInfo,
} from '../types/thread-types.js';

type Props = {
  +children: React.Node,
};
type ChatMentionContextType = {
  +getChatMentionSearchIndex: (
    threadInfo: ThreadInfo,
  ) => SentencePrefixSearchIndex,
  communityThreadIDForGenesisThreads: { +[id: string]: string },
  chatMentionCandidatesObj: ChatMentionCandidatesObj,
};

const emptySearchIndex = new SentencePrefixSearchIndex();
const ChatMentionContext: React.Context<?ChatMentionContextType> =
  React.createContext<?ChatMentionContextType>({
    getChatMentionSearchIndex: () => emptySearchIndex,
    communityThreadIDForGenesisThreads: {},
    chatMentionCandidatesObj: {},
  });

function ChatMentionProvider(props: Props): React.Node {
  const { children } = props;

  const { communityThreadIDForGenesisThreads, chatMentionCandidatesObj } =
    useChatMentionCandidatesObjAndUtils();
  const searchIndices = useChatMentionSearchIndex(chatMentionCandidatesObj);

  const getChatMentionSearchIndex = React.useCallback(
    (threadInfo: ThreadInfo) => {
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

function useChatMentionContext(): ChatMentionContextType {
  const context = React.useContext(ChatMentionContext);
  invariant(context, 'ChatMentionContext not found');

  return context;
}

function useThreadChatMentionCandidates(
  threadInfo: ThreadInfo,
): ChatMentionCandidates {
  const { communityThreadIDForGenesisThreads, chatMentionCandidatesObj } =
    useChatMentionContext();
  return React.useMemo(() => {
    let communityID,
      result = {};
    if (threadInfo.community === genesis.id) {
      communityID = communityThreadIDForGenesisThreads[threadInfo.id];
    } else {
      communityID = threadInfo.community ?? threadInfo.id;
    }
    if (chatMentionCandidatesObj[communityID]) {
      result = { ...chatMentionCandidatesObj[communityID] };
    }
    delete result[threadInfo.id];
    return result;
  }, [
    chatMentionCandidatesObj,
    communityThreadIDForGenesisThreads,
    threadInfo.community,
    threadInfo.id,
  ]);
}

export {
  ChatMentionProvider,
  useChatMentionContext,
  useThreadChatMentionCandidates,
};
