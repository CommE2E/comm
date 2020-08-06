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

import bcrypt from 'twin-bcrypt';
import _find from 'lodash/fp/find';
import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';
import { promiseAll } from 'lib/utils/promises';
import { permissionLookup } from 'lib/permissions/thread-permissions';
import { filteredThreadIDs } from 'lib/selectors/calendar-filter-selectors';
import { hasMinCodeVersion } from 'lib/shared/version-utils';

import { dbQuery, SQL } from '../database';
import {
  verifyUserIDs,
  verifyUserOrCookieIDs,
  fetchKnownUserInfos,
} from '../fetchers/user-fetchers';
import {
  checkThreadPermission,
  fetchServerThreadInfos,
  viewerIsMember,
  fetchThreadPermissionsBlob,
} from '../fetchers/thread-fetchers';
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
    if (!row.role) {
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
  const messageData = {
    type: messageTypes.CHANGE_ROLE,
    threadID: request.threadID,
    creatorID: viewer.userID,
    time: Date.now(),
    userIDs: memberIDs,
    newRole: request.role,
  };
  const [newMessageInfos, { threadInfos, viewerUpdates }] = await Promise.all([
    createMessages(viewer, [messageData]),
    commitMembershipChangeset(viewer, changeset),
  ]);

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
    if (!row.role) {
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

  const messageData = {
    type: messageTypes.REMOVE_MEMBERS,
    threadID: request.threadID,
    creatorID: viewerID,
    time: Date.now(),
    removedUserIDs: actualMemberIDs,
  };
  const [newMessageInfos, { threadInfos, viewerUpdates }] = await Promise.all([
    createMessages(viewer, [messageData]),
    commitMembershipChangeset(viewer, changeset),
  ]);

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

  const [isMember, { threadInfos: serverThreadInfos }] = await Promise.all([
    viewerIsMember(viewer, request.threadID),
    fetchServerThreadInfos(SQL`t.id = ${request.threadID}`),
  ]);
  if (!isMember) {
    throw new ServerError('invalid_parameters');
  }
  const serverThreadInfo = serverThreadInfos[request.threadID];

  const viewerID = viewer.userID;
  if (_find({ name: 'Admins' })(serverThreadInfo.roles)) {
    let otherUsersExist = false;
    let otherAdminsExist = false;
    for (let member of serverThreadInfo.members) {
      const role = member.role;
      if (!role || member.id === viewerID) {
        continue;
      }
      otherUsersExist = true;
      if (serverThreadInfo.roles[role].name === 'Admins') {
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

  const messageData = {
    type: messageTypes.LEAVE_THREAD,
    threadID: request.threadID,
    creatorID: viewerID,
    time: Date.now(),
  };
  const [{ threadInfos, viewerUpdates }] = await Promise.all([
    commitMembershipChangeset(viewer, changeset),
    createMessages(viewer, [messageData]),
  ]);

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
  const name = request.changes.name;
  if (name !== undefined && name !== null) {
    changedFields.name = request.changes.name;
    sqlUpdate.name = request.changes.name ? request.changes.name : null;
  }
  const description = request.changes.description;
  if (description !== undefined && description !== null) {
    changedFields.description = request.changes.description;
    sqlUpdate.description = request.changes.description
      ? request.changes.description
      : null;
  }
  if (request.changes.color) {
    const color = request.changes.color.toLowerCase();
    changedFields.color = color;
    sqlUpdate.color = color;
  }
  const parentThreadID = request.changes.parentThreadID;
  if (parentThreadID !== undefined) {
    if (parentThreadID !== null) {
      validationPromises.canMoveThread = checkThreadPermission(
        viewer,
        parentThreadID,
        threadPermissions.CREATE_SUBTHREADS,
      );
    }
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
  if (newMemberIDs) {
    validationPromises.fetchNewMembers = fetchKnownUserInfos(
      viewer,
      newMemberIDs,
    );
  }

  validationPromises.threadPermissionsBlob = fetchThreadPermissionsBlob(
    viewer,
    request.threadID,
  );

  // Two unrelated purposes for this query:
  // - get hash for viewer password check (users table)
  // - get current value of type, parent_thread_id (threads table)
  const validationQuery = SQL`
    SELECT u.hash, t.type, t.parent_thread_id
    FROM users u
    LEFT JOIN threads t ON t.id = ${request.threadID}
    WHERE u.id = ${viewer.userID}
  `;
  validationPromises.validationQuery = dbQuery(validationQuery);

  const {
    canMoveThread,
    threadPermissionsBlob,
    fetchNewMembers,
    validationQuery: [validationResult],
  } = await promiseAll(validationPromises);
  if (canMoveThread === false) {
    throw new ServerError('invalid_credentials');
  }
  if (fetchNewMembers) {
    invariant(newMemberIDs, 'should be set');
    for (const newMemberID of newMemberIDs) {
      if (!fetchNewMembers[newMemberID]) {
        throw new ServerError('invalid_credentials');
      }
    }
  }

  if (Object.keys(sqlUpdate).length === 0 && !newMemberIDs) {
    throw new ServerError('invalid_parameters');
  }

  if (validationResult.length === 0 || validationResult[0].type === null) {
    throw new ServerError('internal_error');
  }
  const validationRow = validationResult[0];

  if (sqlUpdate.name || sqlUpdate.description || sqlUpdate.color) {
    const canEditThread = permissionLookup(
      threadPermissionsBlob,
      threadPermissions.EDIT_THREAD,
    );
    if (!canEditThread) {
      throw new ServerError('invalid_credentials');
    }
  }
  if (sqlUpdate.parent_thread_id || sqlUpdate.type) {
    const canEditPermissions = permissionLookup(
      threadPermissionsBlob,
      threadPermissions.EDIT_PERMISSIONS,
    );
    if (!canEditPermissions) {
      throw new ServerError('invalid_credentials');
    }
    if (
      !request.accountPassword ||
      !bcrypt.compareSync(request.accountPassword, validationRow.hash)
    ) {
      throw new ServerError('invalid_credentials');
    }
  }
  if (newMemberIDs) {
    const canAddMembers = permissionLookup(
      threadPermissionsBlob,
      threadPermissions.ADD_MEMBERS,
    );
    if (!canAddMembers) {
      throw new ServerError('invalid_credentials');
    }
  }

  const oldThreadType = assertThreadType(validationRow.type);
  const oldParentThreadID = validationRow.parentThreadID
    ? validationRow.parentThreadID.toString()
    : null;

  // If the thread is being switched to nested, a parent must be specified
  if (
    oldThreadType === threadTypes.CHAT_SECRET &&
    threadType !== threadTypes.CHAT_SECRET &&
    oldParentThreadID === null &&
    parentThreadID === null
  ) {
    throw new ServerError('no_parent_thread_specified');
  }

  const nextThreadType =
    threadType !== null && threadType !== undefined
      ? threadType
      : oldThreadType;
  const nextParentThreadID = parentThreadID
    ? parentThreadID
    : oldParentThreadID;

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
    intermediatePromises.recalculatePermissionsChangeset = recalculateAllPermissions(
      request.threadID,
      nextThreadType,
    );
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

  const changeset = { membershipRows, relationshipRows };
  const [newMessageInfos, { threadInfos, viewerUpdates }] = await Promise.all([
    createMessages(viewer, messageDatas),
    commitMembershipChangeset(
      viewer,
      changeset,
      // This forces an update for this thread,
      // regardless of whether any membership rows are changed
      Object.keys(sqlUpdate).length > 0
        ? new Set([request.threadID])
        : new Set(),
    ),
  ]);

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
    viewerIsMember(viewer, request.threadID),
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

  const messageData = {
    type: messageTypes.JOIN_THREAD,
    threadID: request.threadID,
    creatorID: viewer.userID,
    time: Date.now(),
  };
  const [membershipResult] = await Promise.all([
    commitMembershipChangeset(viewer, changeset, new Set(), calendarQuery),
    createMessages(viewer, [messageData]),
  ]);

  const threadSelectionCriteria = {
    threadCursors: { [request.threadID]: false },
  };
  const [fetchMessagesResult, fetchEntriesResult] = await Promise.all([
    fetchMessageInfos(viewer, threadSelectionCriteria, defaultNumberPerThread),
    calendarQuery ? fetchEntryInfos(viewer, [calendarQuery]) : undefined,
  ]);

  // $FlowFixMe should be fixed in flow-bin@0.115 / react-native@0.63
  let userInfos = {
    ...fetchMessagesResult.userInfos,
    ...membershipResult.userInfos,
  };
  let rawEntryInfos;
  if (fetchEntriesResult) {
    userInfos = {
      ...userInfos,
      ...fetchEntriesResult.userInfos,
    };
    rawEntryInfos = fetchEntriesResult.rawEntryInfos;
  }

  const response: ThreadJoinResult = {
    rawMessageInfos: fetchMessagesResult.rawMessageInfos,
    truncationStatuses: fetchMessagesResult.truncationStatuses,
    userInfos,
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

export { updateRole, removeMembers, leaveThread, updateThread, joinThread };
