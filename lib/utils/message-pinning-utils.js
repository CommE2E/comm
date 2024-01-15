// @flow

import { isInvalidPinSourceForThread } from '../shared/message-utils.js';
import { threadHasPermission } from '../shared/thread-utils.js';
import type { MessageInfo, RawMessageInfo } from '../types/message-types.js';
import type {
  MinimallyEncodedThreadInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import type {
  LegacyRawThreadInfo,
  LegacyThreadInfo,
} from '../types/thread-types.js';

function canToggleMessagePin(
  messageInfo: RawMessageInfo | MessageInfo,
  threadInfo:
    | LegacyRawThreadInfo
    | RawThreadInfo
    | LegacyThreadInfo
    | MinimallyEncodedThreadInfo,
): boolean {
  const isValidMessage = !isInvalidPinSourceForThread(messageInfo, threadInfo);
  const hasManagePinsPermission = threadHasPermission(
    threadInfo,
    threadPermissions.MANAGE_PINS,
  );

  return isValidMessage && hasManagePinsPermission;
}

function pinnedMessageCountText(pinnedCount: number): string {
  const messageNoun = pinnedCount === 1 ? 'message' : 'messages';

  return `${pinnedCount} pinned ${messageNoun}`;
}

export { canToggleMessagePin, pinnedMessageCountText };
