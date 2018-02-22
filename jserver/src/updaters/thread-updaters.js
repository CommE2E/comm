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
  visibilityRules,
  assertVisibilityRules,
} from 'lib/types/thread-types';
import type { UserViewer } from '../session/viewer';

import bcrypt from 'twin-bcrypt';

import { ServerError } from 'lib/utils/fetch-utils';
import { messageType, defaultNumberPerThread } from 'lib/types/message-types';
import { promiseAll } from 'lib/utils/promises';
import { permissionHelper } from 'lib/permissions/thread-permissions';

import { pool, SQL } from '../database';
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
import { currentViewer } from '../session/viewer';
import createMessages from '../creators/message-creator';
import { fetchMessageInfos } from '../fetchers/message-fetchers';

async function updateRole(
  request: RoleChangeRequest,
): Promise<ChangeThreadSettingsResult> {
  const [ memberIDs, hasPermission ] = await Promise.all([
    verifyUserIDs(request.memberIDs),
    checkThreadPermission(
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
  const [ result ] = await pool.query(query);

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
    type: messageType.CHANGE_ROLE,
    threadID: request.threadID,
    creatorID: currentViewer().id,
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
    SQL`t.id = ${request.threadID}`,
  );

  return {
    threadInfo: threadInfos[request.threadID],
    newMessageInfos,
  };
}

async function removeMembers(
  request: RemoveMembersRequest,
): Promise<ChangeThreadSettingsResult> {
  const viewerID = currentViewer().id;
  if (request.memberIDs.includes(viewerID)) {
    throw new ServerError('invalid_parameters');
  }

  const [ memberIDs, hasPermission ] = await Promise.all([
    verifyUserOrCookieIDs(request.memberIDs),
    checkThreadPermission(
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
  const [ result ] = await pool.query(query);

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
    type: messageType.REMOVE_MEMBERS,
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
    SQL`t.id = ${request.threadID}`,
  );

  return {
    threadInfo: threadInfos[request.threadID],
    newMessageInfos,
  };
}

async function leaveThread(
  request: LeaveThreadRequest,
): Promise<LeaveThreadResult> {
  const [ isMember, { threadInfos: serverThreadInfos } ] = await Promise.all([
    viewerIsMember(request.threadID),
    fetchServerThreadInfos(SQL`t.id = ${request.threadID}`),
  ]);
  if (!isMember) {
    throw new ServerError('invalid_parameters');
  }
  const serverThreadInfo = serverThreadInfos[request.threadID];

  const viewerID = currentViewer().id;
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
    type: messageType.LEAVE_THREAD,
    threadID: request.threadID,
    creatorID: viewerID,
    time: Date.now(),
  };
  await Promise.all([
    createMessages([messageData]),
    saveMemberships(toSave),
    deleteMemberships(changeset.toDelete),
  ]);

  const { threadInfos } = await fetchThreadInfos();
  return { threadInfos };
}

async function updateThread(
  viewer: UserViewer,
  request: UpdateThreadRequest,
): Promise<ChangeThreadSettingsResult> {
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
        parentThreadID,
        threadPermissions.CREATE_SUBTHREADS,
      );
    }
    // TODO some sort of message when this changes
    sqlUpdate.parent_thread_id = parentThreadID;
  }

  const visRules = request.changes.visibilityRules; 
  if (visRules !== null && visRules !== undefined) {
    if (
      visRules === visibilityRules.OPEN ||
      visRules === visibilityRules.CLOSED ||
      visRules === visibilityRules.SECRET
    ) {
      if (parentThreadID) {
        throw new ServerError('invalid_parameters');
      }
      sqlUpdate.parent_thread_id = null;
      // TODO when you create the message for the above todo, make sure to
      // remove it here!
    }
    if (
      visRules !== visibilityRules.CLOSED &&
      visRules !== visibilityRules.SECRET
    ) {
      if (newPassword) {
        throw new ServerError('invalid_parameters');
      }
      sqlUpdate.hash = null;
    }
    changedFields.visibilityRules = visRules;
    sqlUpdate.visibility_rules = visRules;
  }

  const unverifiedNewMemberIDs = request.changes.newMemberIDs;
  if (unverifiedNewMemberIDs) {
    validationPromises.verifiedNewMemberIDs
      = verifyUserIDs(unverifiedNewMemberIDs);
  }

  validationPromises.threadPermissionInfo = fetchThreadPermissionsInfo(
    request.threadID,
  );

  // Two unrelated purposes for this query:
  // - get hash for viewer password check (users table)
  // - get current value of visibility_rules, parent_thread_id (threads table)
  const validationQuery = SQL`
    SELECT u.hash, t.visibility_rules, t.parent_thread_id
    FROM users u
    LEFT JOIN threads t ON t.id = ${request.threadID}
    WHERE u.id = ${viewer.userID}
  `;
  validationPromises.validationQuery = pool.query(validationQuery);

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
    validationResult[0].visibility_rules === null
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
    sqlUpdate.visibility_rules ||
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

  const oldVisRules = assertVisibilityRules(validationRow.visibility_rules);
  const oldParentThreadID = validationRow.parentThreadID
    ? validationRow.parentThreadID.toString()
    : null;

  // If the thread is being switched to closed, then a password *must* be
  // specified
  if (
    oldVisRules !== visibilityRules.CLOSED &&
    oldVisRules !== visibilityRules.SECRET &&
    (visRules === visibilityRules.CLOSED ||
      visRules === visibilityRules.CLOSED) &&
    !newPassword
  ) {
    throw new ServerError('empty_password');
  }

  // If the thread is being switched to nested, a parent must be specified
  if (
    oldVisRules !== visibilityRules.NESTED_OPEN &&
    visRules === visibilityRules.NESTED_OPEN &&
    oldParentThreadID === null &&
    parentThreadID === null
  ) {
    throw new ServerError('no_parent_thread_specified');
  }

  const nextVisRules = visRules !== null && visRules !== undefined
    ? visRules
    : oldVisRules;
  const nextParentThreadID = parentThreadID
    ? parentThreadID
    : oldParentThreadID;

  // It is not valid to set a parent thread ID on v1 visibilities
  if (
    (
      nextVisRules === visibilityRules.OPEN ||
      nextVisRules === visibilityRules.CLOSED ||
      nextVisRules === visibilityRules.SECRET
    ) && parentThreadID
  ) {
    throw new ServerError('invalid_parameters');
  }

  // It is not valid to set a password on anything other than these visibilities
  if (
    nextVisRules !== visibilityRules.CLOSED &&
    nextVisRules !== visibilityRules.SECRET &&
    newPassword
  ) {
    throw new ServerError('invalid_parameters');
  }

  const savePromises = {};
  if (Object.keys(sqlUpdate).length > 0) {
    const updateQuery = SQL`
      UPDATE threads SET ${sqlUpdate} WHERE id = ${request.threadID}
    `;
    savePromises.updateQuery = pool.query(updateQuery);
  }
  if (newMemberIDs) {
    savePromises.addMembersChangeset = changeRole(
      request.threadID,
      newMemberIDs,
      null,
    );
  }
  if (
    nextVisRules !== oldVisRules ||
    nextParentThreadID !== oldParentThreadID
  ) {
    savePromises.recalculatePermissionsChangeset = recalculateAllPermissions(
      request.threadID,
      nextVisRules,
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
      type: messageType.CHANGE_SETTINGS,
      threadID: request.threadID,
      creatorID: viewer.userID,
      time,
      field: fieldName,
      value: newValue,
    });
  }
  if (newMemberIDs) {
    messageDatas.push({
      type: messageType.ADD_MEMBERS,
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
    SQL`t.id = ${request.threadID}`,
  );

  return {
    threadInfo: threadInfos[request.threadID],
    newMessageInfos,
  };
}

async function joinThread(
  request: ThreadJoinRequest,
): Promise<ThreadJoinResult> {
  const threadQuery = SQL`
    SELECT visibility_rules, hash FROM threads WHERE id = ${request.threadID}
  `;
  const [ isMember, hasPermission, [ threadResult ] ] = await Promise.all([
    viewerIsMember(request.threadID),
    checkThreadPermission(request.threadID, threadPermissions.JOIN_THREAD),
    pool.query(threadQuery),
  ]);
  if (isMember || !hasPermission || threadResult.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const threadRow = threadResult[0];

  // You can only be added to these visibility types if you know the password
  const visRules = assertVisibilityRules(threadRow.visibility_rules);
  if (
    visRules === visibilityRules.CLOSED ||
    visRules === visibilityRules.SECRET
  ) {
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
    [currentViewer().id],
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
    type: messageType.JOIN_THREAD,
    threadID: request.threadID,
    creatorID: currentViewer().id,
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
      threadSelectionCriteria,
      defaultNumberPerThread,
    ),
    fetchThreadInfos(),
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
