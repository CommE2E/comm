// @flow

import { isInvalidPinSourceForThread } from '../shared/message-utils.js';
import { threadHasPermission } from '../shared/thread-utils.js';
import type {
  ComposableMessageInfo,
  RobotextMessageInfo,
  RawMessageInfo,
} from '../types/message-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import type { RawThreadInfo, ThreadInfo } from '../types/thread-types.js';

type ClientProvidedMessageInfo = ComposableMessageInfo | RobotextMessageInfo;
type ServerProvidedMessageInfo = RawMessageInfo;

function canToggleMessagePin(
  messageInfo: ClientProvidedMessageInfo | ServerProvidedMessageInfo,
  threadInfo: RawThreadInfo | ThreadInfo,
): boolean {
  const isValidMessage = !isInvalidPinSourceForThread(messageInfo, threadInfo);
  const hasManagePinsPermission = threadHasPermission(
    threadInfo,
    threadPermissions.MANAGE_PINS,
  );

  return isValidMessage && hasManagePinsPermission;
}

export { canToggleMessagePin };
