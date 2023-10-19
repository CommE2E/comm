// @flow

import * as React from 'react';

import { useSelector } from './redux-utils.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import {
  type UserSurfacedPermissionOption,
  userSurfacedPermissions,
  userSurfacedPermissionOptions,
} from '../types/thread-permission-types.js';
import type { ThreadType } from '../types/thread-types-enum.js';
import { threadTypes } from '../types/thread-types-enum.js';
import type { ThreadInfo, RelativeMemberInfo } from '../types/thread-types.js';

function useFilterPermissionOptionsByThreadType(
  threadType: ThreadType,
): $ReadOnlySet<UserSurfacedPermissionOption> {
  // If the thread is a community announcement root, we want to allow
  // the option to be voiced in the announcement channels. Otherwise,
  // we want to remove that option from being configured since this will
  // be guaranteed on the keyserver.
  const shouldFilterVoicedInAnnouncementChannel =
    threadType === threadTypes.COMMUNITY_ROOT;

  return React.useMemo(() => {
    if (!shouldFilterVoicedInAnnouncementChannel) {
      return userSurfacedPermissionOptions;
    }

    return new Set(
      [...userSurfacedPermissionOptions].filter(
        option =>
          option.userSurfacedPermission !==
          userSurfacedPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS,
      ),
    );
  }, [shouldFilterVoicedInAnnouncementChannel]);
}

function constructRoleDeletionMessagePrompt(
  defaultRoleName: string,
  memberCount: number,
): string {
  let message;
  if (memberCount === 0) {
    message = 'Are you sure you want to delete this role?';
  } else {
    const messageNoun = memberCount === 1 ? 'member' : 'members';
    const messageVerb = memberCount === 1 ? 'is' : 'are';
    message =
      `There ${messageVerb} currently ${memberCount} ${messageNoun} with ` +
      `this role. Deleting the role will automatically assign the ` +
      `${messageNoun} affected to the ${defaultRoleName} role.`;
  }

  return message;
}

type RoleDeletableAndEditableStatus = {
  +isDeletable: boolean,
  +isEditable: boolean,
};
function useRoleDeletableAndEditableStatus(
  roleName: string,
  defaultRoleID: string,
  existingRoleID: string,
): RoleDeletableAndEditableStatus {
  return React.useMemo(() => {
    const canDelete = roleName !== 'Admins' && defaultRoleID !== existingRoleID;
    const canEdit = roleName !== 'Admins';

    return {
      isDeletable: canDelete,
      isEditable: canEdit,
    };
  }, [roleName, defaultRoleID, existingRoleID]);
}

function useRoleNamesFromCommunityThreadInfo(
  threadInfo: ThreadInfo,
  memberInfos: $ReadOnlyArray<RelativeMemberInfo>,
): $ReadOnlyMap<string, ?string> {
  // Our in-code system has chat-specific roles, while the
  // user-surfaced system has roles only for communities. We retrieve roles
  // from the top-level community thread for accuracy, with a rare fallback
  // for potential issues reading memberInfos, primarily in GENESIS threads.
  // The special case is GENESIS threads, since per prior discussion
  // (see context: https://linear.app/comm/issue/ENG-4077/), we don't really
  // support roles for it. Also with GENESIS, the list of members are not
  // populated in the community root. So in this case to prevent crashing, we
  // should just return the role name from the current thread info.
  const { community } = threadInfo;
  const communityThreadInfo = useSelector(state =>
    community ? threadInfoSelector(state)[community] : null,
  );
  const topMostThreadInfo = communityThreadInfo || threadInfo;
  const roleMap = new Map();

  if (topMostThreadInfo.type === threadTypes.GENESIS) {
    memberInfos.forEach(memberInfo =>
      roleMap.set(
        memberInfo.id,
        memberInfo.role ? threadInfo.roles[memberInfo.role].name : null,
      ),
    );
    return roleMap;
  }

  const { members: memberInfosFromTopMostThreadInfo, roles } =
    topMostThreadInfo;
  memberInfosFromTopMostThreadInfo.forEach(memberInfo => {
    roleMap.set(memberInfo.id, memberInfo.role && roles[memberInfo.role].name);
  });
  return roleMap;
}

export {
  useFilterPermissionOptionsByThreadType,
  constructRoleDeletionMessagePrompt,
  useRoleDeletableAndEditableStatus,
  useRoleNamesFromCommunityThreadInfo,
};
