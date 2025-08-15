// @flow

import invariant from 'invariant';

import {
  OPEN_CHILD,
  OPEN_DESCENDANT,
  OPEN_TOP_LEVEL_DESCENDANT,
  TOP_LEVEL_DESCENDANT,
} from './prefixes.js';
import type { RolePermissionBlobs } from './thread-permissions.js';
import { threadTypeIsCommunityRoot } from '../shared/threads/thread-specs.js';
import type {
  ThreadRolePermissionsBlob,
  UserSurfacedPermission,
} from '../types/thread-permission-types.js';
import {
  configurableCommunityPermissions,
  threadPermissionPropagationPrefixes,
  threadPermissions,
  userSurfacedPermissions,
} from '../types/thread-permission-types.js';
import {
  type ThinThreadType,
  threadTypes,
} from '../types/thread-types-enum.js';

const { CHILD, DESCENDANT } = threadPermissionPropagationPrefixes;

function getThreadPermissionBlobFromUserSurfacedPermissions(
  communityUserSurfacedPermissions: $ReadOnlyArray<UserSurfacedPermission>,
  threadType: ThinThreadType,
): ThreadRolePermissionsBlob {
  const mappedUserSurfacedPermissions = communityUserSurfacedPermissions
    .map(permission => [...configurableCommunityPermissions[permission]])
    .flat();

  const userSurfacedPermissionsObj = Object.fromEntries(
    mappedUserSurfacedPermissions.map(p => [p, true]),
  );

  const universalCommunityPermissions =
    getUniversalCommunityRootPermissionsBlob(threadType);

  return {
    ...universalCommunityPermissions,
    ...userSurfacedPermissionsObj,
  };
}

const defaultUserSurfacedPermissions = [
  userSurfacedPermissions.REACT_TO_MESSAGES,
  userSurfacedPermissions.EDIT_MESSAGES,
  userSurfacedPermissions.ADD_MEMBERS,
  userSurfacedPermissions.EDIT_CALENDAR,
  userSurfacedPermissions.CREATE_AND_EDIT_CHANNELS,
  userSurfacedPermissions.DELETE_OWN_MESSAGES,
];

function getRolePermissionBlobsForCommunityRoot(
  threadType: ThinThreadType,
): RolePermissionBlobs {
  const memberPermissions = getThreadPermissionBlobFromUserSurfacedPermissions(
    defaultUserSurfacedPermissions,
    threadType,
  );

  const descendantKnowOf = DESCENDANT + threadPermissions.KNOW_OF;
  const descendantVisible = DESCENDANT + threadPermissions.VISIBLE;
  const topLevelDescendantJoinThread =
    TOP_LEVEL_DESCENDANT + threadPermissions.JOIN_THREAD;
  const childJoinThread = CHILD + threadPermissions.JOIN_THREAD;
  const descendantVoiced = DESCENDANT + threadPermissions.VOICED;
  const descendantEditEntries = DESCENDANT + threadPermissions.EDIT_ENTRIES;
  const descendantEditThreadName =
    DESCENDANT + threadPermissions.EDIT_THREAD_NAME;
  const descendantEditThreadColor =
    DESCENDANT + threadPermissions.EDIT_THREAD_COLOR;
  const descendantEditThreadDescription =
    DESCENDANT + threadPermissions.EDIT_THREAD_DESCRIPTION;
  const descendantEditThreadAvatar =
    DESCENDANT + threadPermissions.EDIT_THREAD_AVATAR;
  const topLevelDescendantCreateSubchannels =
    TOP_LEVEL_DESCENDANT + threadPermissions.CREATE_SUBCHANNELS;
  const topLevelDescendantCreateSidebars =
    TOP_LEVEL_DESCENDANT + threadPermissions.CREATE_SIDEBARS;
  const descendantAddMembers = DESCENDANT + threadPermissions.ADD_MEMBERS;
  const descendantDeleteThread = DESCENDANT + threadPermissions.DELETE_THREAD;
  const descendantEditPermissions =
    DESCENDANT + threadPermissions.EDIT_PERMISSIONS;
  const descendantRemoveMembers = DESCENDANT + threadPermissions.REMOVE_MEMBERS;
  const descendantChangeRole = DESCENDANT + threadPermissions.CHANGE_ROLE;
  const descendantManagePins = DESCENDANT + threadPermissions.MANAGE_PINS;
  const topLevelDescendantVoicedInAnnouncementChannels =
    TOP_LEVEL_DESCENDANT + threadPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS;
  const descendantReactToMessage =
    DESCENDANT + threadPermissions.REACT_TO_MESSAGE;
  const descendantEditMessage = DESCENDANT + threadPermissions.EDIT_MESSAGE;
  const descendantDeleteOwnMessages =
    DESCENDANT + threadPermissions.DELETE_OWN_MESSAGES;
  const descendantDeleteAllMessages =
    DESCENDANT + threadPermissions.DELETE_ALL_MESSAGES;

  const baseAdminPermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [threadPermissions.VOICED]: true,
    [threadPermissions.REACT_TO_MESSAGE]: true,
    [threadPermissions.EDIT_MESSAGE]: true,
    [threadPermissions.EDIT_ENTRIES]: true,
    [threadPermissions.EDIT_THREAD_NAME]: true,
    [threadPermissions.EDIT_THREAD_COLOR]: true,
    [threadPermissions.EDIT_THREAD_DESCRIPTION]: true,
    [threadPermissions.EDIT_THREAD_AVATAR]: true,
    [threadPermissions.CREATE_SUBCHANNELS]: true,
    [threadPermissions.CREATE_SIDEBARS]: true,
    [threadPermissions.DELETE_THREAD]: true,
    [threadPermissions.REMOVE_MEMBERS]: true,
    [threadPermissions.CHANGE_ROLE]: true,
    [threadPermissions.MANAGE_PINS]: true,
    [threadPermissions.MANAGE_INVITE_LINKS]: true,
    [threadPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS]: true,
    [threadPermissions.MANAGE_FARCASTER_CHANNEL_TAGS]: true,
    [threadPermissions.DELETE_OWN_MESSAGES]: true,
    [threadPermissions.DELETE_ALL_MESSAGES]: true,
    [descendantKnowOf]: true,
    [descendantVisible]: true,
    [topLevelDescendantJoinThread]: true,
    [childJoinThread]: true,
    [descendantVoiced]: true,
    [descendantEditEntries]: true,
    [descendantEditThreadName]: true,
    [descendantEditThreadColor]: true,
    [descendantEditThreadDescription]: true,
    [descendantEditThreadAvatar]: true,
    [topLevelDescendantCreateSubchannels]: true,
    [topLevelDescendantCreateSidebars]: true,
    [descendantAddMembers]: true,
    [descendantDeleteThread]: true,
    [descendantEditPermissions]: true,
    [descendantRemoveMembers]: true,
    [descendantChangeRole]: true,
    [descendantManagePins]: true,
    [topLevelDescendantVoicedInAnnouncementChannels]: true,
    [descendantReactToMessage]: true,
    [descendantEditMessage]: true,
    [descendantDeleteOwnMessages]: true,
    [descendantDeleteAllMessages]: true,
  };

  let adminPermissions;
  if (threadType === threadTypes.GENESIS) {
    adminPermissions = {
      ...baseAdminPermissions,
      [threadPermissions.ADD_MEMBERS]: true,
    };
  } else {
    adminPermissions = {
      ...baseAdminPermissions,
      [threadPermissions.LEAVE_THREAD]: true,
    };
  }

  return {
    Members: memberPermissions,
    Admins: adminPermissions,
  };
}

export function getThinThreadPermissionsBlobs(
  thinThreadType: ThinThreadType,
): RolePermissionBlobs {
  if (thinThreadType === threadTypes.SIDEBAR) {
    const memberPermissions = {
      [threadPermissions.VOICED]: true,
      [threadPermissions.LEAVE_THREAD]: true,
    };
    return {
      Members: memberPermissions,
    };
  }

  const openDescendantKnowOf = OPEN_DESCENDANT + threadPermissions.KNOW_OF;
  const openDescendantVisible = OPEN_DESCENDANT + threadPermissions.VISIBLE;
  const openChildJoinThread = OPEN_CHILD + threadPermissions.JOIN_THREAD;

  if (thinThreadType === threadTypes.GENESIS_PRIVATE) {
    const memberPermissions = {
      [threadPermissions.KNOW_OF]: true,
      [threadPermissions.VISIBLE]: true,
      [threadPermissions.VOICED]: true,
      [threadPermissions.CREATE_SIDEBARS]: true,
      [openDescendantKnowOf]: true,
      [openDescendantVisible]: true,
      [openChildJoinThread]: true,
    };
    return {
      Members: memberPermissions,
    };
  }

  if (thinThreadType === threadTypes.GENESIS_PERSONAL) {
    return {
      Members: {
        [threadPermissions.KNOW_OF]: true,
        [threadPermissions.VISIBLE]: true,
        [threadPermissions.VOICED]: true,
        [threadPermissions.CREATE_SIDEBARS]: true,
        [openDescendantKnowOf]: true,
        [openDescendantVisible]: true,
        [openChildJoinThread]: true,
      },
    };
  }

  const openTopLevelDescendantJoinThread =
    OPEN_TOP_LEVEL_DESCENDANT + threadPermissions.JOIN_THREAD;

  if (!threadTypeIsCommunityRoot(thinThreadType)) {
    const memberPermissions = {
      [threadPermissions.VOICED]: true,
      [threadPermissions.KNOW_OF]: true,
      [threadPermissions.VISIBLE]: true,
      [threadPermissions.CREATE_SIDEBARS]: true,
      [threadPermissions.LEAVE_THREAD]: true,
      [openDescendantKnowOf]: true,
      [openDescendantVisible]: true,
      [openTopLevelDescendantJoinThread]: true,
      [openChildJoinThread]: true,
    };
    return {
      Members: memberPermissions,
    };
  }

  return getRolePermissionBlobsForCommunityRoot(thinThreadType);
}

// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
function getUniversalCommunityRootPermissionsBlob(
  threadType: ThinThreadType,
): ThreadRolePermissionsBlob {
  const openDescendantKnowOf = OPEN_DESCENDANT + threadPermissions.KNOW_OF;
  const openDescendantVisible = OPEN_DESCENDANT + threadPermissions.VISIBLE;
  const openChildJoinThread = OPEN_CHILD + threadPermissions.JOIN_THREAD;
  const openTopLevelDescendantJoinThread =
    OPEN_TOP_LEVEL_DESCENDANT + threadPermissions.JOIN_THREAD;

  const genesisUniversalCommunityPermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [openDescendantKnowOf]: true,
    [openDescendantVisible]: true,
    [openTopLevelDescendantJoinThread]: true,
  };

  const baseUniversalCommunityPermissions = {
    ...genesisUniversalCommunityPermissions,
    [threadPermissions.CREATE_SIDEBARS]: true,
    [threadPermissions.LEAVE_THREAD]: true,
    [openChildJoinThread]: true,
  };

  if (threadType === threadTypes.GENESIS) {
    return genesisUniversalCommunityPermissions;
  } else if (threadType === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT) {
    return baseUniversalCommunityPermissions;
  } else if (threadType === threadTypes.COMMUNITY_ROOT) {
    return {
      ...baseUniversalCommunityPermissions,
      [threadPermissions.VOICED]: true,
    };
  }

  invariant(false, 'invalid threadType parameter');
}

export {
  getThreadPermissionBlobFromUserSurfacedPermissions,
  getUniversalCommunityRootPermissionsBlob,
};
