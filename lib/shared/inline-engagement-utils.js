// @flow

import type { ReactionInfo } from '../selectors/chat-selectors.js';
import type { MinimallyEncodedThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { ThreadInfo } from '../types/thread-types.js';

function getInlineEngagementSidebarText(
  threadInfo: ?ThreadInfo | ?MinimallyEncodedThreadInfo,
): string {
  if (!threadInfo) {
    return '';
  }
  const repliesCount = threadInfo.repliesCount || 1;
  return `${repliesCount} ${repliesCount > 1 ? 'replies' : 'reply'}`;
}

function reactionsToRawString(reactions: ReactionInfo): string {
  const reactionStringParts = [];

  for (const reaction in reactions) {
    const reactionInfo = reactions[reaction];
    reactionStringParts.push(`${reaction}${reactionInfo.users.length}`);
  }

  return reactionStringParts.join('');
}

export { getInlineEngagementSidebarText, reactionsToRawString };
