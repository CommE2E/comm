// @flow

import * as React from 'react';

import { threadIsPending } from './thread-utils.js';
import { threadSpecs } from './threads/thread-specs.js';
import genesis from '../facts/genesis.js';
import {
  ancestorThreadInfos,
  threadInfoSelector,
} from '../selectors/thread-selectors.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useAncestorThreads(
  threadInfo: ThreadInfo,
): $ReadOnlyArray<ThreadInfo> {
  const ancestorThreads = useSelector(ancestorThreadInfos(threadInfo.id));

  const genesisThreadInfo = useSelector(
    state => threadInfoSelector(state)[genesis().id],
  );

  return React.useMemo(() => {
    if (!threadIsPending(threadInfo.id)) {
      return ancestorThreads.length > 1
        ? ancestorThreads.slice(0, -1)
        : ancestorThreads;
    }
    if (
      threadSpecs[threadInfo.type].protocol
        .arePendingThreadsDescendantsOfGenesis
    ) {
      if (genesisThreadInfo) {
        return [genesisThreadInfo];
      }
    }
    return [];
  }, [ancestorThreads, genesisThreadInfo, threadInfo.id, threadInfo.type]);
}

export { useAncestorThreads };
