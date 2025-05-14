// @flow

import invariant from 'invariant';

import { OPEN_CHILD, OPEN_DESCENDANT } from './prefixes.js';
import {
  type ThreadRolePermissionsBlob,
  threadPermissions,
} from '../types/thread-permission-types.js';
import {
  type ThickThreadType,
  threadTypeIsThick,
  threadTypes,
} from '../types/thread-types-enum.js';

function getThickThreadRolePermissionsBlob(
  threadType: ThickThreadType,
): ThreadRolePermissionsBlob {
  invariant(threadTypeIsThick(threadType), 'ThreadType should be thick');
  const openDescendantKnowOf = OPEN_DESCENDANT + threadPermissions.KNOW_OF;
  const openDescendantVisible = OPEN_DESCENDANT + threadPermissions.VISIBLE;
  const openChildJoinThread = OPEN_CHILD + threadPermissions.JOIN_THREAD;

  const basePermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [threadPermissions.VOICED]: true,
    [threadPermissions.REACT_TO_MESSAGE]: true,
    [threadPermissions.EDIT_MESSAGE]: true,
    [threadPermissions.EDIT_THREAD_NAME]: true,
    [threadPermissions.EDIT_THREAD_COLOR]: true,
    [threadPermissions.EDIT_THREAD_DESCRIPTION]: true,
    [threadPermissions.EDIT_THREAD_AVATAR]: true,
    [threadPermissions.DELETE_OWN_MESSAGES]: true,
  };
  if (threadType === threadTypes.THICK_SIDEBAR) {
    return {
      ...basePermissions,
      [threadPermissions.JOIN_THREAD]: true,
      [threadPermissions.ADD_MEMBERS]: true,
      [threadPermissions.LEAVE_THREAD]: true,
    };
  }
  if (
    threadType === threadTypes.PRIVATE ||
    threadType === threadTypes.PERSONAL
  ) {
    return {
      ...basePermissions,
      [threadPermissions.EDIT_ENTRIES]: true,
      [threadPermissions.CREATE_SIDEBARS]: true,
      [openDescendantKnowOf]: true,
      [openDescendantVisible]: true,
      [openChildJoinThread]: true,
    };
  }
  return {
    ...basePermissions,
    [threadPermissions.EDIT_ENTRIES]: true,
    [threadPermissions.CREATE_SIDEBARS]: true,
    [threadPermissions.ADD_MEMBERS]: true,
    [threadPermissions.LEAVE_THREAD]: true,
    [openDescendantKnowOf]: true,
    [openDescendantVisible]: true,
    [openChildJoinThread]: true,
  };
}

export { getThickThreadRolePermissionsBlob };
