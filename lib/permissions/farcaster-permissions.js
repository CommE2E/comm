// @flow

import type { RolePermissionBlobs } from './thread-permissions.js';
import type { FarcasterConversation } from '../shared/farcaster/farcaster-conversation-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';

function getFarcasterRolePermissionsBlobs(
  conversation: FarcasterConversation,
): RolePermissionBlobs {
  if (conversation.isGroup) {
    // These permissions are based on the experimentation:
    // Only admins can create invite links
    // Admins can decide who can add users (admins or all the members)
    // Admins can change a role of a user
    // Only admins can edit a thread
    let membersPermissions;
    if (conversation.groupPreferences?.onlyAdminsCanWrite) {
      membersPermissions = {
        [threadPermissions.KNOW_OF]: true,
        [threadPermissions.VISIBLE]: true,
        [threadPermissions.REACT_TO_MESSAGE]: true,
        [threadPermissions.LEAVE_THREAD]: true,
      };
    } else {
      membersPermissions = {
        [threadPermissions.KNOW_OF]: true,
        [threadPermissions.VISIBLE]: true,
        [threadPermissions.VOICED]: true,
        [threadPermissions.REACT_TO_MESSAGE]: true,
        [threadPermissions.EDIT_MESSAGE]: true,
        [threadPermissions.DELETE_OWN_MESSAGES]: true,
        [threadPermissions.ADD_MEMBERS]:
          !!conversation.groupPreferences?.membersCanInvite,
        [threadPermissions.LEAVE_THREAD]: true,
      };
    }
    const adminPermissions = {
      [threadPermissions.KNOW_OF]: true,
      [threadPermissions.VISIBLE]: true,
      [threadPermissions.VOICED]: true,
      [threadPermissions.REACT_TO_MESSAGE]: true,
      [threadPermissions.EDIT_MESSAGE]: true,
      [threadPermissions.EDIT_THREAD_NAME]: true,
      [threadPermissions.EDIT_THREAD_DESCRIPTION]: true,
      [threadPermissions.EDIT_THREAD_AVATAR]: true,
      [threadPermissions.REMOVE_MEMBERS]: true,
      [threadPermissions.CHANGE_ROLE]: true,
      [threadPermissions.MANAGE_PINS]: true,
      [threadPermissions.MANAGE_INVITE_LINKS]: true,
      [threadPermissions.DELETE_OWN_MESSAGES]: true,
      [threadPermissions.DELETE_ALL_MESSAGES]: true,
      [threadPermissions.ADD_MEMBERS]: true,
      [threadPermissions.LEAVE_THREAD]: true,
    };
    return {
      Admins: adminPermissions,
      Members: membersPermissions,
    };
  } else {
    const permissions = {
      [threadPermissions.KNOW_OF]: true,
      [threadPermissions.VISIBLE]: true,
      [threadPermissions.VOICED]: true,
      [threadPermissions.REACT_TO_MESSAGE]: true,
      [threadPermissions.EDIT_MESSAGE]: true,
      [threadPermissions.EDIT_THREAD_NAME]: true,
      [threadPermissions.EDIT_THREAD_DESCRIPTION]: true,
      [threadPermissions.EDIT_THREAD_AVATAR]: true,
      [threadPermissions.DELETE_OWN_MESSAGES]: true,
    };
    return {
      Members: permissions,
    };
  }
}

export { getFarcasterRolePermissionsBlobs };
