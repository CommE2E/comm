// @flow

import { specialRoles } from 'lib/permissions/special-roles.js';
import { getRolePermissionBlobs } from 'lib/permissions/thread-permissions.js';
import { filteredThreadIDs } from 'lib/selectors/calendar-filter-selectors.js';
import { getPinnedContentFromMessage } from 'lib/shared/message-utils.js';
import {
  threadHasAdminRole,
  roleIsAdminRole,
  viewerIsMember,
  getThreadTypeParentRequirement,
} from 'lib/shared/thread-utils.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { RawMessageInfo, MessageData } from 'lib/types/message-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import {
  type RoleChangeRequest,
  type ChangeThreadSettingsResult,
  type RemoveMembersRequest,
  type LeaveThreadRequest,
  type LeaveThreadResult,
  type UpdateThreadRequest,
  type ServerThreadJoinRequest,
  type ThreadJoinResult,
  type ToggleMessagePinRequest,
  type ToggleMessagePinResult,
} from 'lib/types/thread-types.js';
import { updateTypes } from 'lib/types/update-types-enum.js';
import { ServerError } from 'lib/utils/errors.js';
import { canToggleMessagePin } from 'lib/utils/message-pinning-utils.js';
import { promiseAll, ignorePromiseRejections } from 'lib/utils/promises.js';
import { firstLine } from 'lib/utils/string-utils.js';
import { validChatNameRegex } from 'lib/utils/validation-utils.js';

import { reportLinkUsage } from './link-updaters.js';
import { updateRoles } from './role-updaters.js';
import {
  changeRole,
  recalculateThreadPermissions,
  commitMembershipChangeset,
  type MembershipChangeset,
  type MembershipRow,
} from './thread-permission-updaters.js';
import createMessages from '../creators/message-creator.js';
import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { fetchCommunityFarcasterChannelTag } from '../fetchers/community-fetchers.js';
import { checkIfInviteLinkIsValid } from '../fetchers/link-fetchers.js';
import { fetchMessageInfoByID } from '../fetchers/message-fetchers.js';
import { fetchRoles } from '../fetchers/role-fetchers.js';
import {
  fetchThreadInfos,
  fetchServerThreadInfos,
  determineThreadAncestry,
  rawThreadInfosFromServerThreadInfos,
  determineThreadAncestryForPossibleMemberResolution,
} from '../fetchers/thread-fetchers.js';
import {
  checkThreadPermission,
  viewerHasPositiveRole,
  checkThread,
  validateCandidateMembers,
} from '../fetchers/thread-permission-fetchers.js';
import {
  verifyUserIDs,
  verifyUserOrCookieIDs,
} from '../fetchers/user-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import { fcCache } from '../utils/fc-cache.js';
import { findUserIdentities } from '../utils/identity-utils.js';
import { redisCache } from '../utils/redis-cache.js';
import RelationshipChangeset from '../utils/relationship-changeset.js';

type UpdateRoleOptions = {
  +silenceNewMessages?: boolean,
  +forcePermissionRecalculation?: boolean,
};
async function updateRole(
  viewer: Viewer,
  request: RoleChangeRequest,
  options?: UpdateRoleOptions,
): Promise<ChangeThreadSettingsResult> {
  const silenceNewMessages = options?.silenceNewMessages;
  const forcePermissionRecalculation = options?.forcePermissionRecalculation;

  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const [memberIDs, hasPermission, fetchThreadResult] = await Promise.all([
    verifyUserIDs(request.memberIDs),
    checkThreadPermission(
      viewer,
      request.threadID,
      threadPermissions.CHANGE_ROLE,
    ),
    fetchServerThreadInfos({ threadID: request.threadID }),
  ]);
  if (memberIDs.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const threadInfo = fetchThreadResult.threadInfos[request.threadID];
  if (!threadInfo) {
    throw new ServerError('invalid_parameters');
  }

  const adminRoleID = Object.keys(threadInfo.roles).find(
    roleID => threadInfo.roles[roleID].name === 'Admins',
  );

  // Ensure that there will always still be at least one admin in a community
  if (adminRoleID && adminRoleID !== request.role) {
    const memberRoles = memberIDs.map(
      memberID =>
        threadInfo.members.find(member => member.id === memberID)?.role,
    );

    const communityAdminsCount = threadInfo.members.filter(
      member => member.role === adminRoleID,
    ).length;

    const changedAdminsCount = memberRoles.filter(
      memberRole => memberRole === adminRoleID,
    ).length;

    if (changedAdminsCount >= communityAdminsCount) {
      throw new ServerError('invalid_parameters');
    }
  }

  const query = SQL`
    SELECT user, role
    FROM memberships
    WHERE user IN (${memberIDs})
      AND thread = ${request.threadID}
  `;
  const [result] = await dbQuery(query);

  let nonMemberUser = false;
  let numResults = 0;
  for (const row of result) {
    if (row.role <= 0) {
      nonMemberUser = true;
      break;
    }
    numResults++;
  }
  if (nonMemberUser || numResults < memberIDs.length) {
    throw new ServerError('invalid_parameters');
  }

  const changeset = await changeRole(
    request.threadID,
    memberIDs,
    request.role,
    {
      forcePermissionRecalculation: !!forcePermissionRecalculation,
    },
  );

  const { viewerUpdates } = await commitMembershipChangeset(
    viewer,
    changeset,
    forcePermissionRecalculation
      ? { changedThreadIDs: new Set([request.threadID]) }
      : undefined,
  );

  let newMessageInfos: Array<RawMessageInfo> = [];
  if (!silenceNewMessages) {
    const messageData = {
      type: messageTypes.CHANGE_ROLE,
      threadID: request.threadID,
      creatorID: viewer.userID,
      time: Date.now(),
      userIDs: memberIDs,
      newRole: request.role,
      roleName: threadInfo.roles[request.role].name,
    };
    newMessageInfos = await createMessages(viewer, [messageData]);
  }

  return { updatesResult: { newUpdates: viewerUpdates }, newMessageInfos };
}

async function removeMembers(
  viewer: Viewer,
  request: RemoveMembersRequest,
): Promise<ChangeThreadSettingsResult> {
  const viewerID = viewer.userID;
  if (request.memberIDs.includes(viewerID)) {
    throw new ServerError('invalid_parameters');
  }

  const [memberIDs, hasPermission] = await Promise.all([
    verifyUserOrCookieIDs(request.memberIDs),
    checkThreadPermission(
      viewer,
      request.threadID,
      threadPermissions.REMOVE_MEMBERS,
    ),
  ]);
  if (memberIDs.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const query = SQL`
    SELECT m.user, m.role, r.id AS default_role
    FROM memberships m
    LEFT JOIN roles r ON r.special_role = ${specialRoles.DEFAULT_ROLE}
      AND r.thread = ${request.threadID}
    WHERE m.user IN (${memberIDs})
      AND m.thread = ${request.threadID}
  `;
  const [result] = await dbQuery(query);

  let nonDefaultRoleUser = false;
  const actualMemberIDs = [];
  for (const row of result) {
    if (row.role <= 0) {
      continue;
    }
    actualMemberIDs.push(row.user.toString());
    if (row.role !== row.default_role) {
      nonDefaultRoleUser = true;
    }
  }

  if (nonDefaultRoleUser) {
    const hasChangeRolePermission = await checkThreadPermission(
      viewer,
      request.threadID,
      threadPermissions.CHANGE_ROLE,
    );
    if (!hasChangeRolePermission) {
      throw new ServerError('invalid_credentials');
    }
  }

  const changeset = await changeRole(request.threadID, actualMemberIDs, 0);
  const { viewerUpdates } = await commitMembershipChangeset(viewer, changeset);

  const newMessageInfos = await (async () => {
    if (actualMemberIDs.length === 0) {
      return [];
    }
    const messageData = {
      type: messageTypes.REMOVE_MEMBERS,
      threadID: request.threadID,
      creatorID: viewerID,
      time: Date.now(),
      removedUserIDs: actualMemberIDs,
    };
    return await createMessages(viewer, [messageData]);
  })();

  return { updatesResult: { newUpdates: viewerUpdates }, newMessageInfos };
}

async function leaveThread(
  viewer: Viewer,
  request: LeaveThreadRequest,
): Promise<LeaveThreadResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const [fetchThreadResult, hasPermission] = await Promise.all([
    fetchThreadInfos(viewer, { threadID: request.threadID }),
    checkThreadPermission(
      viewer,
      request.threadID,
      threadPermissions.LEAVE_THREAD,
    ),
  ]);

  const threadInfo = fetchThreadResult.threadInfos[request.threadID];

  if (!viewerIsMember(threadInfo)) {
    return {
      updatesResult: { newUpdates: [] },
    };
  }

  if (!hasPermission) {
    throw new ServerError('invalid_parameters');
  }

  const viewerID = viewer.userID;
  if (threadHasAdminRole(threadInfo)) {
    let otherUsersExist = false;
    let otherAdminsExist = false;
    for (const member of threadInfo.members) {
      const role = member.role;
      if (!role || member.id === viewerID) {
        continue;
      }
      otherUsersExist = true;
      if (roleIsAdminRole(threadInfo.roles[role])) {
        otherAdminsExist = true;
        break;
      }
    }
    if (otherUsersExist && !otherAdminsExist) {
      throw new ServerError('invalid_parameters');
    }
  }

  const changeset = await changeRole(request.threadID, [viewerID], 0);
  const { viewerUpdates } = await commitMembershipChangeset(viewer, changeset);

  const messageData = {
    type: messageTypes.LEAVE_THREAD,
    threadID: request.threadID,
    creatorID: viewerID,
    time: Date.now(),
  };
  await createMessages(viewer, [messageData]);

  return { updatesResult: { newUpdates: viewerUpdates } };
}

type UpdateThreadOptions = Partial<{
  +forceAddMembers: boolean,
  +forceUpdateRoot: boolean,
  +silenceMessages: boolean,
  +ignorePermissions: boolean,
}>;

async function updateThread(
  viewer: Viewer,
  request: UpdateThreadRequest,
  options?: UpdateThreadOptions,
): Promise<ChangeThreadSettingsResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }
  const forceAddMembers = options?.forceAddMembers ?? false;
  const forceUpdateRoot = options?.forceUpdateRoot ?? false;
  const silenceMessages = options?.silenceMessages ?? false;
  const ignorePermissions =
    (options?.ignorePermissions && viewer.isScriptViewer) ?? false;

  const changedFields: { [string]: string | number } = {};
  const sqlUpdate: { [string]: ?string | number } = {};
  const untrimmedName = request.changes.name;
  if (untrimmedName !== undefined && untrimmedName !== null) {
    const name = firstLine(untrimmedName);
    if (name.search(validChatNameRegex) === -1) {
      throw new ServerError('invalid_chat_name');
    }
    changedFields.name = name;
    sqlUpdate.name = name;
  }
  const { description } = request.changes;
  if (description !== undefined && description !== null) {
    changedFields.description = description;
    sqlUpdate.description = description;
  }
  if (request.changes.color) {
    const color = request.changes.color.toLowerCase();
    changedFields.color = color;
    sqlUpdate.color = color;
  }
  const { parentThreadID } = request.changes;
  if (parentThreadID !== undefined) {
    // TODO some sort of message when this changes
    sqlUpdate.parent_thread_id = parentThreadID;
  }

  const { avatar } = request.changes;
  if (avatar) {
    changedFields.avatar =
      avatar.type !== 'remove' ? JSON.stringify(avatar) : '';
    sqlUpdate.avatar = avatar.type !== 'remove' ? JSON.stringify(avatar) : null;
  }

  const threadType = request.changes.type;
  if (threadType !== null && threadType !== undefined) {
    changedFields.type = threadType;
    sqlUpdate.type = threadType;
  }

  if (
    !ignorePermissions &&
    threadType !== null &&
    threadType !== undefined &&
    threadType !== threadTypes.COMMUNITY_OPEN_SUBTHREAD &&
    threadType !== threadTypes.COMMUNITY_SECRET_SUBTHREAD
  ) {
    throw new ServerError('invalid_parameters');
  }

  const newMemberIDs =
    request.changes.newMemberIDs && request.changes.newMemberIDs.length > 0
      ? [...new Set(request.changes.newMemberIDs)]
      : null;

  if (
    Object.keys(sqlUpdate).length === 0 &&
    !newMemberIDs &&
    !forceUpdateRoot
  ) {
    throw new ServerError('invalid_parameters');
  }

  const serverThreadInfosPromise = fetchServerThreadInfos({
    threadID: request.threadID,
  });

  const hasNecessaryPermissionsPromise = (async () => {
    if (ignorePermissions) {
      return;
    }
    const checks = [];
    if (sqlUpdate.name !== undefined) {
      checks.push({
        check: 'permission',
        permission: threadPermissions.EDIT_THREAD_NAME,
      });
    }
    if (sqlUpdate.description !== undefined) {
      checks.push({
        check: 'permission',
        permission: threadPermissions.EDIT_THREAD_DESCRIPTION,
      });
    }
    if (sqlUpdate.color !== undefined) {
      checks.push({
        check: 'permission',
        permission: threadPermissions.EDIT_THREAD_COLOR,
      });
    }
    if (sqlUpdate.avatar !== undefined) {
      checks.push({
        check: 'permission',
        permission: threadPermissions.EDIT_THREAD_AVATAR,
      });
    }
    if (parentThreadID !== undefined || sqlUpdate.type !== undefined) {
      checks.push({
        check: 'permission',
        permission: threadPermissions.EDIT_PERMISSIONS,
      });
    }
    if (newMemberIDs) {
      checks.push({
        check: 'permission',
        permission: threadPermissions.ADD_MEMBERS,
      });
    }
    const hasNecessaryPermissions = await checkThread(
      viewer,
      request.threadID,
      checks,
    );
    if (!hasNecessaryPermissions) {
      throw new ServerError('invalid_credentials');
    }
  })();

  const [serverThreadInfos] = await Promise.all([
    serverThreadInfosPromise,
    hasNecessaryPermissionsPromise,
  ]);

  const serverThreadInfo = serverThreadInfos.threadInfos[request.threadID];
  if (!serverThreadInfo) {
    throw new ServerError('internal_error');
  }

  // Threads with source message should be visible to everyone, but we can't
  // guarantee it for COMMUNITY_SECRET_SUBTHREAD threads so we forbid it for
  // now. In the future, if we want to support this, we would need to unlink the
  // source message.
  if (
    threadType !== null &&
    threadType !== undefined &&
    threadType !== threadTypes.SIDEBAR &&
    threadType !== threadTypes.COMMUNITY_OPEN_SUBTHREAD &&
    serverThreadInfo.sourceMessageID
  ) {
    throw new ServerError('invalid_parameters');
  }

  // You can't change the parent thread of a current or former SIDEBAR
  if (parentThreadID !== undefined && serverThreadInfo.sourceMessageID) {
    throw new ServerError('invalid_parameters');
  }

  const oldThreadType = serverThreadInfo.type;
  const oldParentThreadID = serverThreadInfo.parentThreadID;
  const oldContainingThreadID = serverThreadInfo.containingThreadID;
  const oldCommunity = serverThreadInfo.community;
  const oldDepth = serverThreadInfo.depth;

  const nextThreadType =
    threadType !== null && threadType !== undefined
      ? threadType
      : oldThreadType;
  let nextParentThreadID =
    parentThreadID !== undefined ? parentThreadID : oldParentThreadID;

  // Does the new thread type preclude a parent?
  if (
    threadType !== undefined &&
    threadType !== null &&
    getThreadTypeParentRequirement(threadType) === 'disabled' &&
    nextParentThreadID !== null
  ) {
    nextParentThreadID = null;
    sqlUpdate.parent_thread_id = null;
  }

  // Does the new thread type require a parent?
  if (
    threadType !== undefined &&
    threadType !== null &&
    getThreadTypeParentRequirement(threadType) === 'required' &&
    nextParentThreadID === null
  ) {
    throw new ServerError('no_parent_thread_specified');
  }

  const determineThreadAncestryPromise = determineThreadAncestry(
    nextParentThreadID,
    nextThreadType,
  );

  const confirmParentPermissionPromise = (async () => {
    if (ignorePermissions || !nextParentThreadID) {
      return;
    }
    if (
      nextParentThreadID === oldParentThreadID &&
      (nextThreadType === threadTypes.SIDEBAR) ===
        (oldThreadType === threadTypes.SIDEBAR)
    ) {
      return;
    }
    const hasParentPermission = await checkThreadPermission(
      viewer,
      nextParentThreadID,
      nextThreadType === threadTypes.SIDEBAR
        ? threadPermissions.CREATE_SIDEBARS
        : threadPermissions.CREATE_SUBCHANNELS,
    );
    if (!hasParentPermission) {
      throw new ServerError('invalid_parameters');
    }
  })();

  const rolesNeedUpdate = forceUpdateRoot || nextThreadType !== oldThreadType;

  const validateNewMembersPromise = (async () => {
    if (!newMemberIDs || ignorePermissions) {
      return;
    }

    const defaultRolePermissionsPromise = (async () => {
      let rolePermissions;
      if (!rolesNeedUpdate) {
        const rolePermissionsQuery = SQL`
          SELECT r.permissions
          FROM threads t
          LEFT JOIN roles r ON r.special_role = ${specialRoles.DEFAULT_ROLE} 
            AND r.thread = ${request.threadID}
          WHERE t.id = ${request.threadID}
        `;
        const [result] = await dbQuery(rolePermissionsQuery);
        if (result.length > 0) {
          rolePermissions = JSON.parse(result[0].permissions);
        }
      }
      if (!rolePermissions) {
        rolePermissions = getRolePermissionBlobs(nextThreadType).Members;
      }
      return rolePermissions;
    })();

    const [defaultRolePermissions, nextThreadAncestry] = await Promise.all([
      defaultRolePermissionsPromise,
      determineThreadAncestryPromise,
    ]);

    const containingThreadIDForPossibleMemberResolution =
      determineThreadAncestryForPossibleMemberResolution(
        nextParentThreadID,
        nextThreadAncestry.containingThreadID,
      );

    const { newMemberIDs: validatedIDs } = await validateCandidateMembers(
      viewer,
      { newMemberIDs },
      {
        threadType: nextThreadType,
        parentThreadID: nextParentThreadID,
        containingThreadID: containingThreadIDForPossibleMemberResolution,
        defaultRolePermissions,
        communityID: nextThreadAncestry.community,
      },
      { requireRelationship: !forceAddMembers },
    );
    if (
      validatedIDs &&
      Number(validatedIDs?.length) < Number(newMemberIDs?.length)
    ) {
      throw new ServerError('invalid_credentials');
    }
  })();

  const { nextThreadAncestry } = await promiseAll({
    nextThreadAncestry: determineThreadAncestryPromise,
    confirmParentPermissionPromise,
    validateNewMembersPromise,
  });
  if (nextThreadAncestry.containingThreadID !== oldContainingThreadID) {
    sqlUpdate.containing_thread_id = nextThreadAncestry.containingThreadID;
  }
  if (nextThreadAncestry.community !== oldCommunity) {
    if (!ignorePermissions) {
      throw new ServerError('invalid_parameters');
    }
    sqlUpdate.community = nextThreadAncestry.community;
  }
  if (nextThreadAncestry.depth !== oldDepth) {
    sqlUpdate.depth = nextThreadAncestry.depth;
  }

  const updateQueryPromise = (async () => {
    if (Object.keys(sqlUpdate).length === 0) {
      return;
    }

    const { avatar: avatarUpdate, ...nonAvatarUpdates } = sqlUpdate;
    const updatePromises = [];

    if (Object.keys(nonAvatarUpdates).length > 0) {
      const nonAvatarUpdateQuery = SQL`
        UPDATE threads
        SET ${nonAvatarUpdates}
        WHERE id = ${request.threadID}
      `;
      updatePromises.push(dbQuery(nonAvatarUpdateQuery));
    }

    if (avatarUpdate !== undefined) {
      const avatarUploadID =
        avatar && (avatar.type === 'image' || avatar.type === 'encrypted_image')
          ? avatar.uploadID
          : null;

      const avatarUpdateQuery = SQL`
        START TRANSACTION;

        UPDATE uploads
        SET container = NULL
        WHERE container = ${request.threadID}
          AND (
            ${avatarUploadID} IS NULL
            OR EXISTS (
              SELECT 1
              FROM uploads
              WHERE id = ${avatarUploadID}
                AND ${avatarUploadID} IS NOT NULL
                AND uploader = ${viewer.userID}
                AND container IS NULL
                AND user_container IS NULL
                AND thread IS NULL
             )
          );

        UPDATE uploads
        SET container = ${request.threadID}
        WHERE id = ${avatarUploadID}
          AND ${avatarUploadID} IS NOT NULL
          AND uploader = ${viewer.userID}
          AND container IS NULL
          AND user_container IS NULL
          AND thread IS NULL;

        UPDATE threads
        SET avatar = ${avatarUpdate}
        WHERE id = ${request.threadID}
          AND (
            ${avatarUploadID} IS NULL
            OR EXISTS (
              SELECT 1
              FROM uploads
              WHERE id = ${avatarUploadID}
                AND ${avatarUploadID} IS NOT NULL
                AND uploader = ${viewer.userID}
                AND container = ${request.threadID}
                AND thread IS NULL
            )
          );

        COMMIT;
      `;

      updatePromises.push(
        dbQuery(avatarUpdateQuery, { multipleStatements: true }),
      );
    }

    await Promise.all(updatePromises);
  })();

  const updateRolesPromise = (async () => {
    if (rolesNeedUpdate) {
      await updateRoles(viewer, request.threadID, nextThreadType);
    }
  })();

  const addMembersChangesetPromise: Promise<?MembershipChangeset> =
    (async () => {
      if (!newMemberIDs) {
        return undefined;
      }
      await Promise.all([updateQueryPromise, updateRolesPromise]);
      return await changeRole(request.threadID, newMemberIDs, null, {
        setNewMembersToUnread: true,
      });
    })();

  const recalculatePermissionsChangesetPromise: Promise<?MembershipChangeset> =
    (async () => {
      const threadRootChanged =
        rolesNeedUpdate || nextParentThreadID !== oldParentThreadID;
      if (!threadRootChanged) {
        return undefined;
      }
      await Promise.all([updateQueryPromise, updateRolesPromise]);
      return await recalculateThreadPermissions(request.threadID);
    })();

  const [addMembersChangeset, recalculatePermissionsChangeset] =
    await Promise.all([
      addMembersChangesetPromise,
      recalculatePermissionsChangesetPromise,
      updateQueryPromise,
      updateRolesPromise,
    ]);

  const membershipRows: Array<MembershipRow> = [];
  const relationshipChangeset = new RelationshipChangeset();
  if (recalculatePermissionsChangeset) {
    const {
      membershipRows: recalculateMembershipRows,
      relationshipChangeset: recalculateRelationshipChangeset,
    } = recalculatePermissionsChangeset;
    membershipRows.push(...recalculateMembershipRows);
    relationshipChangeset.addAll(recalculateRelationshipChangeset);
  }
  let addedMemberIDs;
  if (addMembersChangeset) {
    const {
      membershipRows: addMembersMembershipRows,
      relationshipChangeset: addMembersRelationshipChangeset,
    } = addMembersChangeset;
    addedMemberIDs = addMembersMembershipRows
      .filter(
        row =>
          row.operation === 'save' &&
          row.threadID === request.threadID &&
          Number(row.role) > 0,
      )
      .map(row => row.userID);
    membershipRows.push(...addMembersMembershipRows);
    relationshipChangeset.addAll(addMembersRelationshipChangeset);
  }

  const changeset = { membershipRows, relationshipChangeset };
  const { viewerUpdates } = await commitMembershipChangeset(viewer, changeset, {
    // This forces an update for this thread,
    // regardless of whether any membership rows are changed
    changedThreadIDs:
      Object.keys(sqlUpdate).length > 0
        ? new Set([request.threadID])
        : new Set(),
    // last_message will be updated automatically if we send a message,
    // so we only need to handle it here when we silence new messages
    updateMembershipsLastMessage: silenceMessages,
  });

  let newMessageInfos: Array<RawMessageInfo> = [];
  if (!silenceMessages) {
    const time = Date.now();
    const messageDatas: Array<MessageData> = [];
    for (const fieldName in changedFields) {
      const newValue = changedFields[fieldName];
      messageDatas.push({
        type: messageTypes.CHANGE_SETTINGS,
        threadID: request.threadID,
        creatorID: viewer.userID,
        time,
        field: fieldName,
        value: newValue,
      });
    }
    if (addedMemberIDs && addedMemberIDs.length > 0) {
      messageDatas.push({
        type: messageTypes.ADD_MEMBERS,
        threadID: request.threadID,
        creatorID: viewer.userID,
        time,
        addedUserIDs: addedMemberIDs,
      });
    }
    newMessageInfos = await createMessages(viewer, messageDatas);
  }

  return { updatesResult: { newUpdates: viewerUpdates }, newMessageInfos };
}

async function joinThread(
  viewer: Viewer,
  request: ServerThreadJoinRequest,
): Promise<ThreadJoinResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const communityFarcasterChannelTagPromise = fetchCommunityFarcasterChannelTag(
    viewer,
    request.threadID,
  );

  const permissionPromise = (async () => {
    if (request.inviteLinkSecret) {
      return await checkIfInviteLinkIsValid(
        request.inviteLinkSecret,
        request.threadID,
      );
    }

    const threadPermissionPromise = checkThreadPermission(
      viewer,
      request.threadID,
      threadPermissions.JOIN_THREAD,
    );

    const [threadPermission, communityFarcasterChannelTag] = await Promise.all([
      threadPermissionPromise,
      communityFarcasterChannelTagPromise,
    ]);

    return threadPermission || !!communityFarcasterChannelTag;
  })();

  const [isMember, hasPermission, communityFarcasterChannelTag] =
    await Promise.all([
      viewerHasPositiveRole(viewer, request.threadID),
      permissionPromise,
      communityFarcasterChannelTagPromise,
    ]);

  if (!hasPermission) {
    throw new ServerError('invalid_parameters');
  }

  const { calendarQuery } = request;
  if (isMember) {
    const response: ThreadJoinResult = {
      rawMessageInfos: [],
      truncationStatuses: {},
      userInfos: {},
      updatesResult: {
        newUpdates: [],
      },
    };
    return response;
  }

  if (calendarQuery) {
    const threadFilterIDs = filteredThreadIDs(calendarQuery.filters);
    if (
      !threadFilterIDs ||
      threadFilterIDs.size !== 1 ||
      threadFilterIDs.values().next().value !== request.threadID
    ) {
      throw new ServerError('invalid_parameters');
    }
  }

  let role = null;
  if (communityFarcasterChannelTag) {
    role = await fetchUserRoleForThread(
      viewer,
      request.threadID,
      communityFarcasterChannelTag,
    );
  }

  const changeset = await changeRole(request.threadID, [viewer.userID], role, {
    defaultSubscription: request.defaultSubscription,
  });

  const membershipResult = await commitMembershipChangeset(viewer, changeset, {
    calendarQuery,
  });

  if (request.inviteLinkSecret) {
    ignorePromiseRejections(reportLinkUsage(request.inviteLinkSecret));
  }

  const messageData = {
    type: messageTypes.JOIN_THREAD,
    threadID: request.threadID,
    creatorID: viewer.userID,
    time: Date.now(),
  };
  const newMessages = await createMessages(viewer, [messageData]);

  return {
    rawMessageInfos: newMessages,
    truncationStatuses: {},
    userInfos: membershipResult.userInfos,
    updatesResult: {
      newUpdates: membershipResult.viewerUpdates,
    },
  };
}

async function fetchUserRoleForThread(
  viewer: Viewer,
  threadID: string,
  communityFarcasterChannelTag: string,
): Promise<string | null> {
  const farcasterID = await getUserFarcasterID(viewer.userID);

  if (!farcasterID) {
    return null;
  }

  const leadsChannel = await userLeadsChannel(
    communityFarcasterChannelTag,
    farcasterID,
  );
  if (!leadsChannel) {
    return null;
  }

  const roleInfos = await fetchRoles(threadID);
  for (const roleInfo of roleInfos) {
    if (roleInfo.specialRole === specialRoles.ADMIN_ROLE) {
      return roleInfo.id;
    }
  }

  return null;
}

async function getUserFarcasterID(userID: string): Promise<?string> {
  const cachedUserIdentity = await redisCache.getUserIdentity(userID);
  if (cachedUserIdentity) {
    return cachedUserIdentity.farcasterID;
  }

  const response = await findUserIdentities([userID]);
  const userIdentity = response.identities[userID];
  if (!userIdentity) {
    return null;
  }

  ignorePromiseRejections(redisCache.setUserIdentity(userID, userIdentity));
  return userIdentity.farcasterID;
}

async function userLeadsChannel(
  communityFarcasterChannelTag: string,
  farcasterID: string,
) {
  const cachedChannelInfo = await redisCache.getChannelInfo(
    communityFarcasterChannelTag,
  );
  if (cachedChannelInfo) {
    return cachedChannelInfo.lead.fid === parseInt(farcasterID);
  }

  // In the background, we fetch and cache followed channels
  ignorePromiseRejections(
    (async () => {
      const followedChannels =
        await fcCache?.getFollowedFarcasterChannelsForFID(farcasterID);
      if (followedChannels) {
        await Promise.allSettled(
          followedChannels.map(followedChannel =>
            redisCache.setChannelInfo(followedChannel.id, followedChannel),
          ),
        );
      }
    })(),
  );

  const channelInfo = await fcCache?.getFarcasterChannelForChannelID(
    communityFarcasterChannelTag,
  );
  if (channelInfo) {
    return channelInfo.lead.fid === parseInt(farcasterID);
  }

  return false;
}

async function updateMessagePinForThread(
  viewer: Viewer,
  request: ToggleMessagePinRequest,
  behavior: 'normal' | 'force_silently',
): Promise<ToggleMessagePinResult> {
  const { messageID, action } = request;

  const targetMessage = await fetchMessageInfoByID(viewer, messageID);
  if (!targetMessage) {
    throw new ServerError('invalid_parameters');
  }

  const { threadID } = targetMessage;
  const fetchServerThreadInfosResult = await fetchServerThreadInfos({
    threadID,
  });

  if (behavior === 'normal') {
    const { threadInfos: rawThreadInfos } = rawThreadInfosFromServerThreadInfos(
      viewer,
      fetchServerThreadInfosResult,
    );
    const rawThreadInfo = rawThreadInfos[threadID];

    const canTogglePin = canToggleMessagePin(targetMessage, rawThreadInfo);
    if (!canTogglePin) {
      throw new ServerError('invalid_parameters');
    }
  }

  const pinnedValue = action === 'pin' ? 1 : 0;
  const pinTimeValue = action === 'pin' ? Date.now() : null;
  const pinnedCountValue = action === 'pin' ? 1 : -1;

  const query = SQL`
    UPDATE messages AS m, threads AS t
    SET m.pinned = ${pinnedValue},
      m.pin_time = ${pinTimeValue},
      t.pinned_count = t.pinned_count + ${pinnedCountValue}
    WHERE m.id = ${messageID}
      AND m.thread = ${threadID}
      AND t.id = ${threadID}
      AND m.pinned != ${pinnedValue}
  `;

  const [result] = await dbQuery(query);

  if (result.affectedRows === 0) {
    return {
      newMessageInfos: [],
      threadID,
    };
  }

  const createMessagesAsync = async () => {
    if (behavior === 'force_silently') {
      return ([]: Array<RawMessageInfo>);
    }

    const messageData = {
      type: messageTypes.TOGGLE_PIN,
      threadID,
      targetMessageID: messageID,
      action,
      pinnedContent: getPinnedContentFromMessage(targetMessage),
      creatorID: viewer.userID,
      time: Date.now(),
    };
    return await createMessages(viewer, [messageData]);
  };

  const createUpdatesAsync = async () => {
    const { threadInfos: serverThreadInfos } = fetchServerThreadInfosResult;
    const time = Date.now();
    const updates = [];
    for (const member of serverThreadInfos[threadID].members) {
      updates.push({
        userID: member.id,
        time,
        threadID,
        type: updateTypes.UPDATE_THREAD,
      });
    }
    await createUpdates(updates);
  };

  const [newMessageInfos] = await Promise.all([
    createMessagesAsync(),
    createUpdatesAsync(),
  ]);

  return {
    newMessageInfos,
    threadID,
  };
}

export {
  updateRole,
  removeMembers,
  leaveThread,
  updateThread,
  joinThread,
  updateMessagePinForThread,
};
