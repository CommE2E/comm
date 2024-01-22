// @flow

import * as React from 'react';

import genesis from '../facts/genesis.js';
import {
  ancestorThreadInfos,
  threadInfoSelector,
} from '../selectors/thread-selectors.js';
import { threadIsPending } from '../shared/thread-utils.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { LegacyThreadInfo } from '../types/thread-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useAncestorThreads(
  threadInfo: LegacyThreadInfo | ThreadInfo,
): $ReadOnlyArray<LegacyThreadInfo | ThreadInfo> {
  const ancestorThreads = useSelector(ancestorThreadInfos(threadInfo.id));

  const genesisThreadInfo = useSelector(
    state => threadInfoSelector(state)[genesis.id],
  );

  return React.useMemo(() => {
    if (!threadIsPending(threadInfo.id)) {
      return ancestorThreads.length > 1
        ? ancestorThreads.slice(0, -1)
        : ancestorThreads;
    }
    return genesisThreadInfo ? [genesisThreadInfo] : [];
  }, [ancestorThreads, genesisThreadInfo, threadInfo.id]);
}

export { useAncestorThreads };
