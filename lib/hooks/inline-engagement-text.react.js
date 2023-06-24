// @flow

import type { ThreadInfo } from '../types/thread-types.js';

function useInlineEngagementText(threadInfo: ?ThreadInfo): string {
  if (!threadInfo) {
    return '';
  }
  const repliesCount = threadInfo.repliesCount || 1;
  return `${repliesCount} ${repliesCount > 1 ? 'replies' : 'reply'}`;
}

export default useInlineEngagementText;
