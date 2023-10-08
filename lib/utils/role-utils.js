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

function useRoleNameFromCommunityThreadInfo(
  threadInfo: ThreadInfo,
  memberInfo: RelativeMemberInfo,
): ?string {
  // With the nature of how roles are set up, when introspecting into a
  // non-community root thread, the roles in the threadInfo will just be
  // "Members". This means that if we simply introspect into the threadInfo
  // here, and try to pull the role, we'll potentially only get Members.
  // The solution here is to pull the roles information from the top-most
  // (i.e. community) threadInfo, and then use the roles from there.
  // In the event that the threadInfo is a community thread, then we can just
  // use the roles from the threadInfo directly. I'm choosing to fallback
  // if (for some reason) the memberInfo from the 'topMostThreadInfo' is
  // undefined to prevent the app from crashing, but this ideally shouldn't
  // happen in the first place in non-GENESIS threads since a member part of a
  // subchannel should be a member of the community.
  const { community } = threadInfo;
  const communityThreadInfo = useSelector(state =>
    community ? threadInfoSelector(state)[community] : null,
  );
  const topMostThreadInfo = communityThreadInfo || threadInfo;

  // The special case is GENESIS threads, since per prior discussion
  // (see context: https://linear.app/comm/issue/ENG-4077/), we don't really
  // support roles for it. Also with GENESIS, the list of
  // members are not populated in the community root. So in this case
  // to prevent crashing, we should just return the role name from the
  // current thread info.
  if (topMostThreadInfo.type === threadTypes.GENESIS) {
    return memberInfo.role && threadInfo.roles[memberInfo.role].name;
  }

  const { roles } = topMostThreadInfo;
  const memberInfoFromTopMostThreadInfo = topMostThreadInfo.members.find(
    member => member.id === memberInfo.id,
  );
  if (!memberInfoFromTopMostThreadInfo) {
    console.warn(
      `Could not find memberInfo for member ${memberInfo.id} in ` +
        `thread ${topMostThreadInfo.id}. This is unexpected, ` +
        `please investigate.`,
    );
  }

  const { role } = memberInfoFromTopMostThreadInfo || memberInfo;
  const roleName = role && roles[role].name;
  return roleName;
}

export {
  useFilterPermissionOptionsByThreadType,
  constructRoleDeletionMessagePrompt,
  useRoleDeletableAndEditableStatus,
  useRoleNameFromCommunityThreadInfo,
};
