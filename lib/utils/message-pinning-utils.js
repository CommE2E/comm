// @flow

import { isInvalidPinSourceForThread } from '../shared/message-utils.js';
import {
  threadHasPermission,
  useThreadHasPermission,
} from '../shared/thread-utils.js';
import type { MessageInfo, RawMessageInfo } from '../types/message-types.js';
import type {
  ThreadInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import type { LegacyRawThreadInfo } from '../types/thread-types.js';

function canToggleMessagePin(
  messageInfo: RawMessageInfo,
  threadInfo: LegacyRawThreadInfo | RawThreadInfo,
): boolean {
  const isValidMessage = !isInvalidPinSourceForThread(messageInfo, threadInfo);
  const hasManagePinsPermission = threadHasPermission(
    threadInfo,
    threadPermissions.MANAGE_PINS,
  );

  return isValidMessage && hasManagePinsPermission;
}

function useCanToggleMessagePin(
  messageInfo: ?MessageInfo,
  threadInfo: ThreadInfo,
): boolean {
  const hasManagePinsPermission = useThreadHasPermission(
    threadInfo,
    threadPermissions.MANAGE_PINS,
  );
  return (
    !!messageInfo &&
    hasManagePinsPermission &&
    !isInvalidPinSourceForThread(messageInfo, threadInfo)
  );
}

function pinnedMessageCountText(pinnedCount: number): string {
  const messageNoun = pinnedCount === 1 ? 'message' : 'messages';

  return `${pinnedCount} pinned ${messageNoun}`;
}

export { canToggleMessagePin, useCanToggleMessagePin, pinnedMessageCountText };
