// @flow

import type { ReactionInfo } from '../selectors/chat-selectors.js';
import { getMessageLabel } from '../shared/edit-messages-utils.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';

type BaseChatMessageItemForEngagementCheck = {
  +threadCreatedFromMessage: ?ThreadInfo,
  +reactions: ReactionInfo,
  +hasBeenEdited?: ?boolean,
  ...
};
function chatMessageItemHasEngagement(
  item: BaseChatMessageItemForEngagementCheck,
  threadID: string,
): boolean {
  const label = getMessageLabel(item.hasBeenEdited, threadID);
  return (
    !!label ||
    !!item.threadCreatedFromMessage ||
    Object.keys(item.reactions).length > 0
  );
}

export { chatMessageItemHasEngagement };
