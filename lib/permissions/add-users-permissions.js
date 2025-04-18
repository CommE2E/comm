// @flow

import { primaryInviteLinksSelector } from '../selectors/invite-links-selectors.js';
import { useThreadHasPermission } from '../shared/thread-utils.js';
import { threadTypeIsCommunityRoot } from '../shared/threads/thread-specs.js';
import type { InviteLink } from '../types/link-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import { useSelector } from '../utils/redux-utils.js';

type AddUsersPermissions = {
  +inviteLink: InviteLink,
  +canManageLinks: boolean,
  +canAddMembers: boolean,
  +isCommunityRoot: boolean,
};

function useAddUsersPermissions(threadInfo: ThreadInfo): AddUsersPermissions {
  const inviteLink = useSelector(primaryInviteLinksSelector)[threadInfo.id];
  const canManageLinks = useThreadHasPermission(
    threadInfo,
    threadPermissions.MANAGE_INVITE_LINKS,
  );

  const isCommunityRoot = threadTypeIsCommunityRoot(threadInfo.type);

  const canAddMembersViaInviteLink =
    isCommunityRoot && (!!inviteLink || canManageLinks);

  const hasAddMembersPermission = useThreadHasPermission(
    threadInfo,
    threadPermissions.ADD_MEMBERS,
  );
  const canAddMembersManually = hasAddMembersPermission && !isCommunityRoot;

  const canAddMembers = canAddMembersManually || canAddMembersViaInviteLink;

  return { inviteLink, canManageLinks, canAddMembers, isCommunityRoot };
}

export { useAddUsersPermissions };
