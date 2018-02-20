// @flow

import type {
  RoleChangeRequest,
  ChangeThreadSettingsResult,
  RemoveMembersRequest,
} from 'lib/types/thread-types';

import { threadPermissions } from 'lib/types/thread-types';
import { ServerError } from 'lib/utils/fetch-utils';
import { messageType } from 'lib/types/message-types';

import { pool, SQL } from '../database';
import {
  verifyUserIDs,
  verifyUserOrCookieIDs,
} from '../fetchers/user-fetchers';
import {
  checkThreadPermission,
  fetchThreadInfos,
} from '../fetchers/thread-fetchers';
import {
  changeRole,
  saveMemberships,
  deleteMemberships,
} from './thread-permission-updaters';
import { currentViewer } from '../session/viewer';
import createMessages from '../creators/message-creator';

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

export {
  updateRole,
  removeMembers,
};
