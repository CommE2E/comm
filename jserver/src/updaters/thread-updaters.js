// @flow

import type {
  RoleChangeRequest,
  ChangeThreadSettingsResult,
} from 'lib/types/thread-types';

import { threadPermissions } from 'lib/types/thread-types';
import { ServerError } from 'lib/utils/fetch-utils';
import { messageType } from 'lib/types/message-types';

import { pool, SQL } from '../database';
import { verifyUserIDs } from '../fetchers/user-fetchers';
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

export {
  updateRole,
};
