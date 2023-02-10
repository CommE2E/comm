// @flow

import genesis from '../facts/genesis.js';
import {
  threadInfoSelector,
  ancestorThreadInfos,
} from '../selectors/thread-selectors.js';
import { threadIsPending } from '../shared/thread-utils.js';
import { type ThreadInfo } from '../types/thread-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useAncestorThreads(
  threadInfo: ThreadInfo,
): $ReadOnlyArray<ThreadInfo> {
  return useSelector(state => {
    if (!threadIsPending(threadInfo.id)) {
      const ancestorThreads = ancestorThreadInfos(threadInfo.id)(state);
      if (ancestorThreads.length > 1) {
        return ancestorThreads.slice(0, -1);
      }

      return ancestorThreads;
    }
    const genesisThreadInfo = threadInfoSelector(state)[genesis.id];
    return genesisThreadInfo ? [genesisThreadInfo] : [];
  });
}

export { useAncestorThreads };
