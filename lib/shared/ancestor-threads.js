// @flow

import genesis from '../facts/genesis';
import {
  threadInfoSelector,
  ancestorThreadInfos,
} from '../selectors/thread-selectors';
import { threadIsPending } from '../shared/thread-utils';
import { type ThreadInfo } from '../types/thread-types';
import { useSelector } from '../utils/redux-utils';

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
