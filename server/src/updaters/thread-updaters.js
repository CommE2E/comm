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
  type ServerThreadInfo,
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
import { permissionLookup } from 'lib/permissions/thread-permissions';
import { filteredThreadIDs } from 'lib/selectors/calendar-filter-selectors';

import { dbQuery, SQL } from '../database';
import {
  verifyUserIDs,
  verifyUserOrCookieIDs,
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
} from './thread-permission-updaters';
import createMessages from '../creators/message-creator';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';

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
  const [
    newMessageInfos,
    { threadInfos, viewerUpdates },
  ] = await Promise.all([
    createMessages([messageData]),
    commitMembershipChangeset(viewer, changeset),
  ]);

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
  const [
    newMessageInfos,
    { threadInfos, viewerUpdates },
  ] = await Promise.all([
    createMessages([messageData]),
    commitMembershipChangeset(viewer, changeset),
  ]);

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
  const [ isMember, { threadInfos: serverThreadInfos } ] = await Promise.all([
    viewerIsMember(viewer, request.threadID),
    fetchServerThreadInfos(SQL`t.id = ${request.threadID}`),
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

  const messageData = {
    type: messageTypes.LEAVE_THREAD,
    threadID: request.threadID,
    creatorID: viewerID,
    time: Date.now(),
  };
  const [ { threadInfos, viewerUpdates } ] = await Promise.all([
    commitMembershipChangeset(viewer, changeset),
    createMessages([messageData]),
  ]);

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

  const unverifiedNewMemberIDs = request.changes.newMemberIDs;
  if (unverifiedNewMemberIDs) {
    validationPromises.verifiedNewMemberIDs
      = verifyUserIDs(unverifiedNewMemberIDs);
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
    verifiedNewMemberIDs,
    validationQuery: [ validationResult ],
  } = await promiseAll(validationPromises);
  if (canMoveThread === false) {
    throw new ServerError('invalid_credentials');
  }

  const newMemberIDs = verifiedNewMemberIDs && verifiedNewMemberIDs.length > 0
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
    const canEditThread = permissionLookup(
      threadPermissionsBlob,
      threadPermissions.EDIT_THREAD,
    );
    if (!canEditThread) {
      throw new ServerError('invalid_credentials');
    }
  }
  if (
    sqlUpdate.parent_thread_id ||
    sqlUpdate.type
  ) {
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
    oldThreadType !== threadTypes.CHAT_NESTED_OPEN &&
    threadType === threadTypes.CHAT_NESTED_OPEN &&
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

  const changeset = [];
  if (recalculatePermissionsChangeset && newMemberIDs) {
    changeset.push(...recalculatePermissionsChangeset.filter(
      rowToSave => !newMemberIDs.includes(rowToSave.userID),
    ));
  } else if (recalculatePermissionsChangeset) {
    changeset.push(...recalculatePermissionsChangeset);
  }
  if (addMembersChangeset) {
    for (let rowToSave of addMembersChangeset) {
      if (rowToSave.operation === "delete") {
        changeset.push(rowToSave);
        continue;
      }
      if (
        rowToSave.operation === "join" &&
        (rowToSave.userID !== viewer.userID ||
          rowToSave.threadID !== request.threadID)
      ) {
        rowToSave.unread = true;
      }
      changeset.push(rowToSave);
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

  const [
    newMessageInfos,
    { threadInfos, viewerUpdates },
  ] = await Promise.all([
    createMessages(messageDatas),
    commitMembershipChangeset(
      viewer,
      changeset,
      // This forces an update for this thread,
      // regardless of whether any membership rows are changed
      Object.keys(sqlUpdate).length > 0
        ? new Set([ request.threadID ])
        : new Set(),
    ),
  ]);

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
  const [ isMember, hasPermission ] = await Promise.all([
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

  const changeset = await changeRole(
    request.threadID,
    [viewer.id],
    null,
  );
  if (!changeset) {
    throw new ServerError('unknown_error');
  }
  for (let rowToSave of changeset) {
    if (rowToSave.operation === "delete") {
      continue;
    }
    if (
      rowToSave.operation === "join" &&
      (rowToSave.userID !== viewer.id ||
        rowToSave.threadID !== request.threadID)
    ) {
      rowToSave.unread = true;
    }
  }

  const messageData = {
    type: messageTypes.JOIN_THREAD,
    threadID: request.threadID,
    creatorID: viewer.id,
    time: Date.now(),
  };
  const [ membershipResult ] = await Promise.all([
    commitMembershipChangeset(viewer, changeset, new Set(), calendarQuery),
    createMessages([messageData]),
  ]);

  const threadSelectionCriteria = {
    threadCursors: {[request.threadID]: false},
  };
  const [
    fetchMessagesResult,
    fetchEntriesResult,
  ] = await Promise.all([
    fetchMessageInfos(
      viewer,
      threadSelectionCriteria,
      defaultNumberPerThread,
    ),
    calendarQuery ? fetchEntryInfos(viewer, calendarQuery) : undefined,
  ]);

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
    threadInfos: membershipResult.threadInfos,
    rawMessageInfos: fetchMessagesResult.rawMessageInfos,
    truncationStatuses: fetchMessagesResult.truncationStatuses,
    userInfos,
    updatesResult: {
      newUpdates: membershipResult.viewerUpdates,
    },
  };
  if (rawEntryInfos) {
    response.rawEntryInfos = rawEntryInfos;
  }
  return response;
}

export {
  updateRole,
  removeMembers,
  leaveThread,
  updateThread,
  joinThread,
};
