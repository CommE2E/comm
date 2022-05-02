// @flow

import * as React from 'react';

import type { ThreadInfo } from '../types/thread-types';

function useInlineSidebarText(
  threadInfo: ThreadInfo,
): {
  repliesText: string,
} {
  const repliesCount = threadInfo.repliesCount || 1;
  const repliesText = `${repliesCount} ${
    repliesCount > 1 ? 'replies' : 'reply'
  }`;

  return React.useMemo(
    () => ({
      repliesText,
    }),
    [repliesText],
  );
}

export default useInlineSidebarText;
