// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  ChatMentionContext,
  type ChatMentionContextType,
} from '../components/chat-mention-provider.react.js';
import genesis from '../facts/genesis.js';
import type {
  ChatMentionCandidates,
  ThreadInfo,
} from '../types/thread-types.js';

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

export { useThreadChatMentionCandidates, useChatMentionContext };
