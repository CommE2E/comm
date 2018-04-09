// @flow

import {
  type RoleChangeRequest,
  type ChangeThreadSettingsResult,
  type RemoveMembersRequest,
  type LeaveThreadRequest,
  type LeaveThreadResult,
  type UpdateThreadRequest,
  type ThreadJoinRequest,
  type ThreadJoinResult,
  threadPermissions,
  threadTypes,
  assertThreadType,
} from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';
import { messageTypes, defaultNumberPerThread } from 'lib/types/message-types';

import bcrypt from 'twin-bcrypt';
import _find from 'lodash/fp/find';

import { ServerError } from 'lib/utils/errors';
import { promiseAll } from 'lib/utils/promises';
import { permissionHelper } from 'lib/permissions/thread-permissions';

import { dbQuery, SQL } from '../database';
import {
  verifyUserIDs,
  verifyUserOrCookieIDs,
} from '../fetchers/user-fetchers';
import {
  checkThreadPermission,
  fetchServerThreadInfos,
  fetchThreadInfos,
  viewerIsMember,
  fetchThreadPermissionsInfo,
} from '../fetchers/thread-fetchers';
import {
  changeRole,
  recalculateAllPermissions,
  saveMemberships,
  deleteMemberships,
} from './thread-permission-updaters';
import createMessages from '../creators/message-creator';
import { fetchMessageInfos } from '../fetchers/message-fetchers';

async function updateRole(
  viewer: Viewer,
  request: RoleChangeRequest,
): Promise<ChangeThreadSettingsResult> {
  const [ memberIDs, hasPermission ] = await Promise.all([
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
  const [ result ] = await dbQuery(query);

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

  const changeset = await changeRole(
    request.threadID,
    memberIDs,
    request.role,
  );
  if (!changeset) {
    throw new ServerError('unknown_error');
  }

  const messageData = {
    type: messageTypes.CHANGE_ROLE,
    threadID: request.threadID,
    creatorID: viewer.id,
    time: Date.now(),
    userIDs: memberIDs,
    newRole: request.role,
  };
  const [ newMessageInfos ] = await Promise.all([
    createMessages([messageData]),
    saveMemberships(changeset.toSave),
    deleteMemberships(changeset.toDelete),
  ]);
  const { threadInfos } = await fetchThreadInfos(
    viewer,
    SQL`t.id = ${request.threadID}`,
  );

  return {
    threadInfo: threadInfos[request.threadID],
    newMessageInfos,
  };
}

async function removeMembers(
  viewer: Viewer,
  request: RemoveMembersRequest,
): Promise<ChangeThreadSettingsResult> {
  const viewerID = viewer.id;
  if (request.memberIDs.includes(viewerID)) {
    throw new ServerError('invalid_parameters');
  }

  const [ memberIDs, hasPermission ] = await Promise.all([
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
  const [ result ] = await dbQuery(query);

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

  const changeset = await changeRole(
    request.threadID,
    actualMemberIDs,
    0,
  );
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
  const [ newMessageInfos ] = await Promise.all([
    createMessages([messageData]),
    saveMemberships(changeset.toSave),
    deleteMemberships(changeset.toDelete),
  ]);
  const { threadInfos } = await fetchThreadInfos(
    viewer,
    SQL`t.id = ${request.threadID}`,
  );

  return {
    threadInfo: threadInfos[request.threadID],
    newMessageInfos,
  };
}

async function leaveThread(
  viewer: Viewer,
  request: LeaveThreadRequest,
): Promise<LeaveThreadResult> {
  const [ isMember, { threadInfos: serverThreadInfos } ] = await Promise.all([
    viewerIsMember(viewer, request.threadID),
    fetchServerThreadInfos(viewer, SQL`t.id = ${request.threadID}`),
  ]);
  if (!isMember) {
    throw new ServerError('invalid_parameters');
  }
  const serverThreadInfo = serverThreadInfos[request.threadID];

  const viewerID = viewer.id;
  if (_find({ name: "Admins" })(serverThreadInfo.roles)) {
    let otherUsersExist = false;
    let otherAdminsExist = false;
    for (let member of serverThreadInfo.members) {
      const role = member.role;
      if (!role || member.id === viewerID) {
        continue;
      }
      otherUsersExist = true;
      if (serverThreadInfo.roles[role].name === "Admins") {
        otherAdminsExist = true;
        break;
      }
    }
    if (otherUsersExist && !otherAdminsExist) {
      throw new ServerError('invalid_parameters');
    }
  }

  const changeset = await changeRole(
    request.threadID,
    [viewerID],
    0,
  );
  if (!changeset) {
    throw new ServerError('unknown_error');
  }
  const toSave = changeset.toSave.map(rowToSave => ({
    ...rowToSave,
    subscription: { home: false, pushNotifs: false },
  }));

  const messageData = {
    type: messageTypes.LEAVE_THREAD,
    threadID: request.threadID,
    creatorID: viewerID,
    time: Date.now(),
  };
  await Promise.all([
    createMessages([messageData]),
    saveMemberships(toSave),
    deleteMemberships(changeset.toDelete),
  ]);

  const { threadInfos } = await fetchThreadInfos(viewer);
  return { threadInfos };
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
  const newPassword = request.changes.password;
  if (newPassword) {
    if (newPassword.trim() === "") {
      throw new ServerError('empty_password');
    }
    sqlUpdate.hash = bcrypt.hashSync(newPassword);
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
    if (
      threadType === threadTypes.OPEN ||
      threadType === threadTypes.CLOSED ||
      threadType === threadTypes.SECRET
    ) {
      if (parentThreadID) {
        throw new ServerError('invalid_parameters');
      }
      sqlUpdate.parent_thread_id = null;
      // TODO when you create the message for the above todo, make sure to
      // remove it here!
    }
    if (
      threadType !== threadTypes.CLOSED &&
      threadType !== threadTypes.SECRET
    ) {
      if (newPassword) {
        throw new ServerError('invalid_parameters');
      }
      sqlUpdate.hash = null;
    }
    changedFields.type = threadType;
    sqlUpdate.type = threadType;
  }

  const unverifiedNewMemberIDs = request.changes.newMemberIDs;
  if (unverifiedNewMemberIDs) {
    validationPromises.verifiedNewMemberIDs
      = verifyUserIDs(unverifiedNewMemberIDs);
  }

  validationPromises.threadPermissionInfo = fetchThreadPermissionsInfo(
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
    threadPermissionInfo,
    verifiedNewMemberIDs,
    validationQuery: [ validationResult ],
  } = await promiseAll(validationPromises);
  if (canMoveThread === false) {
    throw new ServerError('invalid_credentials');
  }

  const newMemberIDs = verifiedNewMemberIDs
    ? verifiedNewMemberIDs
    : null;
  if (Object.keys(sqlUpdate).length === 0 && !newMemberIDs) {
    throw new ServerError('invalid_parameters');
  }

  if (
    validationResult.length === 0 ||
    validationResult[0].type === null
  ) {
    throw new ServerError('internal_error');
  }
  const validationRow = validationResult[0];

  if (
    sqlUpdate.name ||
    sqlUpdate.description ||
    sqlUpdate.color
  ) {
    const canEditThread = permissionHelper(
      threadPermissionInfo,
      threadPermissions.EDIT_THREAD,
    );
    if (!canEditThread) {
      throw new ServerError('invalid_credentials');
    }
  }
  if (
    sqlUpdate.parent_thread_id ||
    sqlUpdate.type ||
    sqlUpdate.hash
  ) {
    const canEditPermissions = permissionHelper(
      threadPermissionInfo,
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
    const canAddMembers = permissionHelper(
      threadPermissionInfo,
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

  // If the thread is being switched to closed, then a password *must* be
  // specified
  if (
    oldThreadType !== threadTypes.CLOSED &&
    oldThreadType !== threadTypes.SECRET &&
    (threadType === threadTypes.CLOSED ||
      threadType === threadTypes.CLOSED) &&
    !newPassword
  ) {
    throw new ServerError('empty_password');
  }

  // If the thread is being switched to nested, a parent must be specified
  if (
    oldThreadType !== threadTypes.NESTED_OPEN &&
    threadType === threadTypes.NESTED_OPEN &&
    oldParentThreadID === null &&
    parentThreadID === null
  ) {
    throw new ServerError('no_parent_thread_specified');
  }

  const nextThreadType = threadType !== null && threadType !== undefined
    ? threadType
    : oldThreadType;
  const nextParentThreadID = parentThreadID
    ? parentThreadID
    : oldParentThreadID;

  // It is not valid to set a parent thread ID on v1 visibilities
  if (
    (
      nextThreadType === threadTypes.OPEN ||
      nextThreadType === threadTypes.CLOSED ||
      nextThreadType === threadTypes.SECRET
    ) && parentThreadID
  ) {
    throw new ServerError('invalid_parameters');
  }

  // It is not valid to set a password on anything other than these visibilities
  if (
    nextThreadType !== threadTypes.CLOSED &&
    nextThreadType !== threadTypes.SECRET &&
    newPassword
  ) {
    throw new ServerError('invalid_parameters');
  }

  const savePromises = {};
  if (Object.keys(sqlUpdate).length > 0) {
    const updateQuery = SQL`
      UPDATE threads SET ${sqlUpdate} WHERE id = ${request.threadID}
    `;
    savePromises.updateQuery = dbQuery(updateQuery);
  }
  if (newMemberIDs) {
    savePromises.addMembersChangeset = changeRole(
      request.threadID,
      newMemberIDs,
      null,
    );
  }
  if (
    nextThreadType !== oldThreadType ||
    nextParentThreadID !== oldParentThreadID
  ) {
    savePromises.recalculatePermissionsChangeset = recalculateAllPermissions(
      request.threadID,
      nextThreadType,
    );
  }
  const {
    addMembersChangeset,
    recalculatePermissionsChangeset,
  } = await promiseAll(savePromises);

  let toSave = [];
  let toDelete = [];
  if (recalculatePermissionsChangeset) {
    toSave = [...toSave, ...recalculatePermissionsChangeset.toSave];
    toDelete = [...toDelete, ...recalculatePermissionsChangeset.toDelete];
  }
  if (addMembersChangeset) {
    toDelete = [...toDelete, ...addMembersChangeset.toDelete];
    for (let rowToSave of addMembersChangeset.toSave) {
      let newRowToSave = {...rowToSave};
      if (rowToSave.role !== "0") {
        newRowToSave.unread = true;
      }
      if (rowToSave.threadID === request.threadID) {
        newRowToSave.subscription = { home: true, pushNotifs: true };
      }
      toSave.push(newRowToSave);
    }
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

  const [ newMessageInfos ] = await Promise.all([
    createMessages(messageDatas),
    saveMemberships(toSave),
    deleteMemberships(toDelete),
  ]);

  const { threadInfos } = await fetchThreadInfos(
    viewer,
    SQL`t.id = ${request.threadID}`,
  );

  return {
    threadInfo: threadInfos[request.threadID],
    newMessageInfos,
  };
}

async function joinThread(
  viewer: Viewer,
  request: ThreadJoinRequest,
): Promise<ThreadJoinResult> {
  const threadQuery = SQL`
    SELECT type, hash FROM threads WHERE id = ${request.threadID}
  `;
  const [ isMember, hasPermission, [ threadResult ] ] = await Promise.all([
    viewerIsMember(viewer, request.threadID),
    checkThreadPermission(
      viewer,
      request.threadID,
      threadPermissions.JOIN_THREAD,
    ),
    dbQuery(threadQuery),
  ]);
  if (isMember || !hasPermission || threadResult.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const threadRow = threadResult[0];

  // You can only be added to these thread types if you know the password
  const threadType = assertThreadType(threadRow.type);
  if (threadType === threadTypes.CLOSED || threadType === threadTypes.SECRET) {
    if (!threadRow.hash) {
      throw new ServerError('database_corruption');
    }
    if (!request.password) {
      throw new ServerError('invalid_parameters');
    }
    if (!bcrypt.compareSync(request.password, threadRow.hash)) {
      throw new ServerError('invalid_credentials');
    }
  }

  const changeset = await changeRole(
    request.threadID,
    [viewer.id],
    null,
  );
  if (!changeset) {
    throw new ServerError('unknown_error');
  }
  const toSave = changeset.toSave.map(rowToSave => ({
    ...rowToSave,
    subscription: { home: true, pushNotifs: true },
  }));

  const messageData = {
    type: messageTypes.JOIN_THREAD,
    threadID: request.threadID,
    creatorID: viewer.id,
    time: Date.now(),
  };
  await Promise.all([
    createMessages([messageData]),
    saveMemberships(toSave),
    deleteMemberships(changeset.toDelete),
  ]);

  const threadSelectionCriteria = {
    threadCursors: {[request.threadID]: false},
  };
  const [ fetchMessagesResult, fetchThreadsResult ] = await Promise.all([
    fetchMessageInfos(
      viewer,
      threadSelectionCriteria,
      defaultNumberPerThread,
    ),
    fetchThreadInfos(viewer),
  ]);

  return {
    threadInfos: fetchThreadsResult.threadInfos,
    rawMessageInfos: fetchMessagesResult.rawMessageInfos,
    truncationStatuses: fetchMessagesResult.truncationStatuses,
    userInfos: {
      ...fetchMessagesResult.userInfos,
      ...fetchThreadsResult.userInfos,
    },
  };
}

export {
  updateRole,
  removeMembers,
  leaveThread,
  updateThread,
  joinThread,
};
