// @flow

import {
  type RoleChangeRequest,
  type ChangeThreadSettingsResult,
  type RemoveMembersRequest,
  type LeaveThreadRequest,
  type LeaveThreadResult,
  type UpdateThreadRequest,
  type ServerThreadJoinRequest,
  type ThreadJoinResult,
  threadPermissions,
  threadTypes,
  assertThreadType,
} from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';
import { messageTypes, defaultNumberPerThread } from 'lib/types/message-types';
import { updateTypes } from 'lib/types/update-types';
import { userRelationshipStatus } from 'lib/types/relationship-types';

import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';
import { promiseAll } from 'lib/utils/promises';
import { filteredThreadIDs } from 'lib/selectors/calendar-filter-selectors';
import { hasMinCodeVersion } from 'lib/shared/version-utils';
import {
  threadHasAdminRole,
  roleIsAdminRole,
  viewerIsMember,
} from 'lib/shared/thread-utils';

import { dbQuery, SQL } from '../database/database';
import {
  verifyUserIDs,
  verifyUserOrCookieIDs,
  fetchKnownUserInfos,
} from '../fetchers/user-fetchers';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import {
  checkThreadPermission,
  viewerIsMember as fetchViewerIsMember,
  checkThread,
} from '../fetchers/thread-permission-fetchers';
import {
  changeRole,
  recalculateAllPermissions,
  commitMembershipChangeset,
  setJoinsToUnread,
  getParentThreadRelationshipRowsForNewUsers,
} from './thread-permission-updaters';
import createMessages from '../creators/message-creator';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { updateRoles } from './role-updaters';
import { createUpdates } from '../creators/update-creator';

async function updateRole(
  viewer: Viewer,
  request: RoleChangeRequest,
): Promise<ChangeThreadSettingsResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const [memberIDs, hasPermission] = await Promise.all([
    verifyUserIDs(request.memberIDs),
    checkThreadPermission(
      viewer,
      request.threadID,
      threadPermissions.CHANGE_ROLE,
    ),
  ]);
  if (memberIDs.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const query = SQL`
    SELECT user, role
    FROM memberships
    WHERE user IN (${memberIDs}) AND thread = ${request.threadID}
  `;
  const [result] = await dbQuery(query);

  let nonMemberUser = false;
  let numResults = 0;
  for (let row of result) {
    if (row.role <= 0) {
      nonMemberUser = true;
      break;
    }
    numResults++;
  }
  if (nonMemberUser || numResults < memberIDs.length) {
    throw new ServerError('invalid_parameters');
  }

  const changeset = await changeRole(request.threadID, memberIDs, request.role);
  if (!changeset) {
    throw new ServerError('unknown_error');
  }
  const { threadInfos, viewerUpdates } = await commitMembershipChangeset(
    viewer,
    changeset,
  );

  const messageData = {
    type: messageTypes.CHANGE_ROLE,
    threadID: request.threadID,
    creatorID: viewer.userID,
    time: Date.now(),
    userIDs: memberIDs,
    newRole: request.role,
  };
  const newMessageInfos = await createMessages(viewer, [messageData]);

  if (hasMinCodeVersion(viewer.platformDetails, 62)) {
    return { updatesResult: { newUpdates: viewerUpdates }, newMessageInfos };
  }

  return {
    threadInfo: threadInfos[request.threadID],
    threadInfos,
    updatesResult: {
      newUpdates: viewerUpdates,
    },
    newMessageInfos,
  };
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
    SELECT m.user, m.role, t.default_role
    FROM memberships m
    LEFT JOIN threads t ON t.id = m.thread
    WHERE m.user IN (${memberIDs}) AND m.thread = ${request.threadID}
  `;
  const [result] = await dbQuery(query);

  let nonDefaultRoleUser = false;
  const actualMemberIDs = [];
  for (let row of result) {
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
  if (!changeset) {
    throw new ServerError('unknown_error');
  }
  const { threadInfos, viewerUpdates } = await commitMembershipChangeset(
    viewer,
    changeset,
  );

  const messageData = {
    type: messageTypes.REMOVE_MEMBERS,
    threadID: request.threadID,
    creatorID: viewerID,
    time: Date.now(),
    removedUserIDs: actualMemberIDs,
  };
  const newMessageInfos = await createMessages(viewer, [messageData]);

  if (hasMinCodeVersion(viewer.platformDetails, 62)) {
    return { updatesResult: { newUpdates: viewerUpdates }, newMessageInfos };
  }

  return {
    threadInfo: threadInfos[request.threadID],
    threadInfos,
    updatesResult: {
      newUpdates: viewerUpdates,
    },
    newMessageInfos,
  };
}

async function leaveThread(
  viewer: Viewer,
  request: LeaveThreadRequest,
): Promise<LeaveThreadResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const fetchThreadResult = await fetchThreadInfos(
    viewer,
    SQL`t.id = ${request.threadID}`,
  );
  const threadInfo = fetchThreadResult.threadInfos[request.threadID];
  if (!viewerIsMember(threadInfo)) {
    throw new ServerError('invalid_parameters');
  }

  const viewerID = viewer.userID;
  if (threadHasAdminRole(threadInfo)) {
    let otherUsersExist = false;
    let otherAdminsExist = false;
    for (let member of threadInfo.members) {
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
  if (!changeset) {
    throw new ServerError('unknown_error');
  }
  const { threadInfos, viewerUpdates } = await commitMembershipChangeset(
    viewer,
    changeset,
  );

  const messageData = {
    type: messageTypes.LEAVE_THREAD,
    threadID: request.threadID,
    creatorID: viewerID,
    time: Date.now(),
  };
  await createMessages(viewer, [messageData]);

  if (hasMinCodeVersion(viewer.platformDetails, 62)) {
    return { updatesResult: { newUpdates: viewerUpdates } };
  }

  return {
    threadInfos,
    updatesResult: {
      newUpdates: viewerUpdates,
    },
  };
}

async function updateThread(
  viewer: Viewer,
  request: UpdateThreadRequest,
): Promise<ChangeThreadSettingsResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const validationPromises = {};

  const changedFields = {};
  const sqlUpdate = {};
  const { name } = request.changes;
  if (name !== undefined && name !== null) {
    changedFields.name = name;
    sqlUpdate.name = name ?? null;
  }
  const { description } = request.changes;
  if (description !== undefined && description !== null) {
    changedFields.description = description;
    sqlUpdate.description = description ?? null;
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

  const threadType = request.changes.type;
  if (threadType !== null && threadType !== undefined) {
    changedFields.type = threadType;
    sqlUpdate.type = threadType;
  }

  const newMemberIDs =
    request.changes.newMemberIDs && request.changes.newMemberIDs.length > 0
      ? [...request.changes.newMemberIDs]
      : null;

  if (Object.keys(sqlUpdate).length === 0 && !newMemberIDs) {
    throw new ServerError('invalid_parameters');
  }

  if (newMemberIDs) {
    validationPromises.fetchNewMembers = fetchKnownUserInfos(
      viewer,
      newMemberIDs,
    );
  }

  const validationQuery = SQL`
    SELECT type, parent_thread_id
    FROM threads
    WHERE id = ${request.threadID}
  `;
  validationPromises.validationQuery = dbQuery(validationQuery);

  const checks = [];
  if (
    sqlUpdate.name !== undefined ||
    sqlUpdate.description !== undefined ||
    sqlUpdate.color !== undefined
  ) {
    checks.push({
      check: 'permission',
      permission: threadPermissions.EDIT_THREAD,
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

  validationPromises.hasNecessaryPermissions = checkThread(
    viewer,
    request.threadID,
    checks,
  );

  const {
    fetchNewMembers,
    validationQuery: [validationResult],
    hasNecessaryPermissions,
  } = await promiseAll(validationPromises);

  if (validationResult.length === 0) {
    throw new ServerError('internal_error');
  }
  const validationRow = validationResult[0];

  if (!hasNecessaryPermissions) {
    throw new ServerError('invalid_credentials');
  }

  const oldThreadType = assertThreadType(validationRow.type);
  const oldParentThreadID = validationRow.parent_thread_id
    ? validationRow.parent_thread_id.toString()
    : null;

  const nextThreadType =
    threadType !== null && threadType !== undefined
      ? threadType
      : oldThreadType;
  const nextParentThreadID =
    parentThreadID !== undefined ? parentThreadID : oldParentThreadID;

  // If the thread is being switched to nested, a parent must be specified
  if (
    oldThreadType === threadTypes.CHAT_SECRET &&
    threadType !== undefined &&
    threadType !== null &&
    threadType !== threadTypes.CHAT_SECRET &&
    nextParentThreadID === null
  ) {
    throw new ServerError('no_parent_thread_specified');
  }

  let parentThreadMembers;
  if (nextParentThreadID) {
    const promises = [
      fetchThreadInfos(viewer, SQL`t.id = ${nextParentThreadID}`),
    ];

    const threadChanged =
      nextParentThreadID !== oldParentThreadID ||
      nextThreadType !== oldThreadType;
    if (threadChanged) {
      promises.push(
        checkThreadPermission(
          viewer,
          nextParentThreadID,
          nextThreadType === threadTypes.SIDEBAR
            ? threadPermissions.CREATE_SIDEBARS
            : threadPermissions.CREATE_SUBTHREADS,
        ),
      );
    }

    const [parentFetchResult, hasParentPermission] = await Promise.all(
      promises,
    );

    const parentThreadInfo = parentFetchResult.threadInfos[nextParentThreadID];
    if (!parentThreadInfo) {
      throw new ServerError('invalid_parameters');
    }
    if (threadChanged && !hasParentPermission) {
      throw new ServerError('invalid_parameters');
    }
    parentThreadMembers = parentThreadInfo.members.map(
      (userInfo) => userInfo.id,
    );
  }

  if (fetchNewMembers) {
    invariant(newMemberIDs, 'should be set');
    for (const newMemberID of newMemberIDs) {
      if (!fetchNewMembers[newMemberID]) {
        throw new ServerError('invalid_credentials');
      }
      const { relationshipStatus } = fetchNewMembers[newMemberID];

      if (relationshipStatus === userRelationshipStatus.FRIEND) {
        continue;
      } else if (
        parentThreadMembers &&
        parentThreadMembers.includes(newMemberID) &&
        relationshipStatus !== userRelationshipStatus.BLOCKED_BY_VIEWER &&
        relationshipStatus !== userRelationshipStatus.BLOCKED_VIEWER &&
        relationshipStatus !== userRelationshipStatus.BOTH_BLOCKED
      ) {
        continue;
      }
      throw new ServerError('invalid_credentials');
    }
  }

  const intermediatePromises = {};
  if (Object.keys(sqlUpdate).length > 0) {
    const updateQuery = SQL`
      UPDATE threads SET ${sqlUpdate} WHERE id = ${request.threadID}
    `;
    intermediatePromises.updateQuery = dbQuery(updateQuery);
  }
  if (newMemberIDs) {
    intermediatePromises.addMembersChangeset = changeRole(
      request.threadID,
      newMemberIDs,
      null,
    );
  }
  if (
    nextThreadType !== oldThreadType ||
    nextParentThreadID !== oldParentThreadID
  ) {
    intermediatePromises.recalculatePermissionsChangeset = (async () => {
      if (nextThreadType !== oldThreadType) {
        await updateRoles(viewer, request.threadID, nextThreadType);
      }
      return await recalculateAllPermissions(request.threadID, nextThreadType);
    })();
  }
  const {
    addMembersChangeset,
    recalculatePermissionsChangeset,
  } = await promiseAll(intermediatePromises);

  const membershipRows = [];
  const relationshipRows = [];
  if (recalculatePermissionsChangeset && newMemberIDs) {
    const {
      membershipRows: recalculateMembershipRows,
      relationshipRows: recalculateRelationshipRows,
    } = recalculatePermissionsChangeset;
    membershipRows.push(...recalculateMembershipRows);
    const parentRelationshipRows = getParentThreadRelationshipRowsForNewUsers(
      request.threadID,
      recalculateMembershipRows,
      newMemberIDs,
    );
    relationshipRows.push(
      ...recalculateRelationshipRows,
      ...parentRelationshipRows,
    );
  } else if (recalculatePermissionsChangeset) {
    const {
      membershipRows: recalculateMembershipRows,
      relationshipRows: recalculateRelationshipRows,
    } = recalculatePermissionsChangeset;
    membershipRows.push(...recalculateMembershipRows);
    relationshipRows.push(...recalculateRelationshipRows);
  }
  if (addMembersChangeset) {
    const {
      membershipRows: addMembersMembershipRows,
      relationshipRows: addMembersRelationshipRows,
    } = addMembersChangeset;
    relationshipRows.push(...addMembersRelationshipRows);
    setJoinsToUnread(addMembersMembershipRows, viewer.userID, request.threadID);
    membershipRows.push(...addMembersMembershipRows);
  }

  const changeset = { membershipRows, relationshipRows };
  const { threadInfos, viewerUpdates } = await commitMembershipChangeset(
    viewer,
    changeset,
    {
      // This forces an update for this thread,
      // regardless of whether any membership rows are changed
      changedThreadIDs:
        Object.keys(sqlUpdate).length > 0
          ? new Set([request.threadID])
          : new Set(),
    },
  );

  const time = Date.now();
  const messageDatas = [];
  for (let fieldName in changedFields) {
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
  if (newMemberIDs) {
    messageDatas.push({
      type: messageTypes.ADD_MEMBERS,
      threadID: request.threadID,
      creatorID: viewer.userID,
      time,
      addedUserIDs: newMemberIDs,
    });
  }
  const newMessageInfos = await createMessages(viewer, messageDatas);

  if (hasMinCodeVersion(viewer.platformDetails, 62)) {
    return { updatesResult: { newUpdates: viewerUpdates }, newMessageInfos };
  }

  return {
    threadInfo: threadInfos[request.threadID],
    threadInfos,
    updatesResult: {
      newUpdates: viewerUpdates,
    },
    newMessageInfos,
  };
}

async function joinThread(
  viewer: Viewer,
  request: ServerThreadJoinRequest,
): Promise<ThreadJoinResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const [isMember, hasPermission] = await Promise.all([
    fetchViewerIsMember(viewer, request.threadID),
    checkThreadPermission(
      viewer,
      request.threadID,
      threadPermissions.JOIN_THREAD,
    ),
  ]);
  if (isMember || !hasPermission) {
    throw new ServerError('invalid_parameters');
  }

  const { calendarQuery } = request;
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

  const changeset = await changeRole(request.threadID, [viewer.userID], null);
  if (!changeset) {
    throw new ServerError('unknown_error');
  }
  setJoinsToUnread(changeset.membershipRows, viewer.userID, request.threadID);

  const membershipResult = await commitMembershipChangeset(viewer, changeset, {
    calendarQuery,
  });

  const messageData = {
    type: messageTypes.JOIN_THREAD,
    threadID: request.threadID,
    creatorID: viewer.userID,
    time: Date.now(),
  };
  await createMessages(viewer, [messageData]);

  const threadSelectionCriteria = {
    threadCursors: { [request.threadID]: false },
  };
  const [fetchMessagesResult, fetchEntriesResult] = await Promise.all([
    fetchMessageInfos(viewer, threadSelectionCriteria, defaultNumberPerThread),
    calendarQuery ? fetchEntryInfos(viewer, [calendarQuery]) : undefined,
  ]);

  const rawEntryInfos = fetchEntriesResult && fetchEntriesResult.rawEntryInfos;
  const response: ThreadJoinResult = {
    rawMessageInfos: fetchMessagesResult.rawMessageInfos,
    truncationStatuses: fetchMessagesResult.truncationStatuses,
    userInfos: membershipResult.userInfos,
    updatesResult: {
      newUpdates: membershipResult.viewerUpdates,
    },
  };
  if (!hasMinCodeVersion(viewer.platformDetails, 62)) {
    response.threadInfos = membershipResult.threadInfos;
  }
  if (rawEntryInfos) {
    response.rawEntryInfos = rawEntryInfos;
  }
  return response;
}

async function updateThreadMembers(viewer: Viewer) {
  const { threadInfos } = await fetchThreadInfos(
    viewer,
    SQL`t.parent_thread_id IS NOT NULL `,
  );

  const updateDatas = [];
  const time = Date.now();
  for (const threadID in threadInfos) {
    updateDatas.push({
      type: updateTypes.UPDATE_THREAD,
      userID: viewer.id,
      time,
      threadID: threadID,
      targetSession: viewer.session,
    });
  }

  await createUpdates(updateDatas);
}

export {
  updateRole,
  removeMembers,
  leaveThread,
  updateThread,
  joinThread,
  updateThreadMembers,
};
