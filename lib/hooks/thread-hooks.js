// @flow

import * as React from 'react';

import { useChatMentionContext } from './chat-mention-hooks.js';
import { childThreadInfos } from '../selectors/thread-selectors.js';
import type { ResolvedThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useChildThreadInfosMap(): {
  +[id: string]: $ReadOnlyArray<ResolvedThreadInfo>,
} {
  const childThreadInfosMap = useSelector(childThreadInfos);

  const { getCommunityThreadIDForGenesisThreads, chatMentionCandidatesObj } =
    useChatMentionContext();

  return React.useMemo(() => {
    const result: { [id: string]: $ReadOnlyArray<ResolvedThreadInfo> } = {};
    for (const parentThreadID in childThreadInfosMap) {
      result[parentThreadID] = childThreadInfosMap[parentThreadID]
        .map(rawThreadInfo => {
          const community =
            getCommunityThreadIDForGenesisThreads(rawThreadInfo);
          if (!community) {
            return undefined;
          }
          const communityThreads = chatMentionCandidatesObj[community];
          if (!communityThreads) {
            return undefined;
          }
          return communityThreads[rawThreadInfo.id]?.threadInfo;
        })
        .filter(Boolean);
    }
    return result;
  }, [
    childThreadInfosMap,
    getCommunityThreadIDForGenesisThreads,
    chatMentionCandidatesObj,
  ]);
}

export { useChildThreadInfosMap };
