// @flow

import type { ChatMessageItem } from 'lib/selectors/chat-selectors';
import { messageKey } from 'lib/shared/message-utils';

import type { ChatMessageItemWithHeight } from '../types/chat-types';

export function chatMessageItemKey(
  item: ChatMessageItemWithHeight | ChatMessageItem,
): string {
  if (item.itemType === 'loader') {
    return 'loader';
  }
  return messageKey(item.messageInfo);
}
