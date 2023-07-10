// @flow

import type { ThreadInfo } from '../types/thread-types.js';

function getInlineEngagementSidebarText(threadInfo: ?ThreadInfo): string {
  if (!threadInfo) {
    return '';
  }
  const repliesCount = threadInfo.repliesCount || 1;
  return `${repliesCount} ${repliesCount > 1 ? 'replies' : 'reply'}`;
}

export { getInlineEngagementSidebarText };
