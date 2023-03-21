// @flow

import { threadHasPermission } from './thread-utils.js';
import { messageTypes } from '../types/message-types.js';
import type {
  RobotextMessageInfo,
  ComposableMessageInfo,
} from '../types/message-types.js';
import { threadPermissions, type ThreadInfo } from '../types/thread-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useCanEditMessage(
  threadInfo: ThreadInfo,
  targetMessageInfo: ComposableMessageInfo | RobotextMessageInfo,
): boolean {
  const currentUserInfo = useSelector(state => state.currentUserInfo);

  if (targetMessageInfo.type !== messageTypes.TEXT) {
    return false;
  }

  if (!currentUserInfo || !currentUserInfo.id) {
    return false;
  }

  const currentUserId = currentUserInfo.id;
  const targetMessageCreatorId = targetMessageInfo.creator.id;
  if (currentUserId !== targetMessageCreatorId) {
    return false;
  }

  const hasPermission = threadHasPermission(
    threadInfo,
    threadPermissions.EDIT_MESSAGE,
  );
  return hasPermission;
}

export { useCanEditMessage };
