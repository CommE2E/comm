// @flow

import { isInvalidPinSource } from '../shared/message-utils.js';
import { threadHasPermission } from '../shared/thread-utils.js';
import type {
  ComposableMessageInfo,
  RobotextMessageInfo,
} from '../types/message-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import type { ThreadInfo } from '../types/thread-types.js';

function canToggleMessagePin(
  messageInfo: ComposableMessageInfo | RobotextMessageInfo,
  threadInfo: ThreadInfo,
): boolean {
  const isValidMessage = !isInvalidPinSource(messageInfo, threadInfo);
  const hasManagePinsPermission = threadHasPermission(
    threadInfo,
    threadPermissions.MANAGE_PINS,
  );

  return isValidMessage && hasManagePinsPermission;
}

export { canToggleMessagePin };
