// @flow

import {
  type NewThreadRequest,
  type NewThreadResult,
  threadTypes,
  threadPermissions,
} from 'lib/types/thread-types';
import { messageTypes } from 'lib/types/message-types';
import type { Viewer } from '../session/viewer';

import { generateRandomColor } from 'lib/shared/thread-utils';
import { ServerError } from 'lib/utils/errors';
import { getAllThreadPermissions } from 'lib/permissions/thread-permissions';

import { dbQuery, SQL } from '../database';
import { checkThreadPermission } from '../fetchers/thread-fetchers';
import createIDs from './id-creator';
import createInitialRolesForNewThread from './role-creator';
import { verifyUserIDs } from '../fetchers/user-fetchers';
import {
  changeRole,
  recalculateAllPermissions,
  commitMembershipChangeset,
} from '../updaters/thread-permission-updaters';
import createMessages from './message-creator';

async function createThread(
  viewer: Viewer,
  request: NewThreadRequest,
): Promise<NewThreadResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const threadType = request.type;
  if (threadType === threadTypes.CHAT_NESTED_OPEN && !request.parentThreadID) {
    throw new ServerError('invalid_parameters');
  }
  let parentThreadID = null;
  if (request.parentThreadID) {
    parentThreadID = request.parentThreadID;
    const hasPermission = await checkThreadPermission(
      viewer,
      parentThreadID,
      threadPermissions.CREATE_SUBTHREADS,
    );
    if (!hasPermission) {
      throw new ServerError('invalid_credentials');
    }
  }

  const [ id ] = await createIDs("threads", 1);
  const newRoles = await createInitialRolesForNewThread(id);

  const name = request.name ? request.name : null;
  const description = request.description ? request.description : null;
  const color = request.color
    ? request.color.toLowerCase()
    : generateRandomColor();
  const time = Date.now();

  const row = [
    id,
    threadType,
    name,
    description,
    viewer.userID,
    time,
    color,
    parentThreadID,
    newRoles.default.id,
  ];
  const query = SQL`
    INSERT INTO threads(id, type, name, description, creator,
      creation_time, color, parent_thread_id, default_role)
    VALUES ${[row]}
  `;
  const [ initialMemberIDs, [ result ] ] = await Promise.all([
    request.initialMemberIDs && request.initialMemberIDs.length > 0
      ? verifyUserIDs(request.initialMemberIDs)
      : undefined,
    dbQuery(query),
  ]);

  const [
    creatorChangeset,
    initialMembersChangeset,
    recalculatePermissionsChangeset,
  ] = await Promise.all([
    changeRole(id, [viewer.userID], newRoles.creator.id),
    initialMemberIDs && initialMemberIDs.length > 0
      ? changeRole(id, initialMemberIDs, null)
      : undefined,
    recalculateAllPermissions(id, threadType),
  ]);
  if (!creatorChangeset) {
    throw new ServerError('unknown_error');
  }
  const initialMemberAndCreatorIDs = initialMemberIDs
    ? [...initialMemberIDs, viewer.userID]
    : [viewer.userID];
  let toSave = [
    ...creatorChangeset.toSave,
    ...recalculatePermissionsChangeset.toSave.filter(
      rowToSave => !initialMemberAndCreatorIDs.includes(rowToSave.userID),
    ),
  ];
  let toDelete = [
    ...creatorChangeset.toDelete,
    ...recalculatePermissionsChangeset.toDelete.filter(
      rowToSave => !initialMemberAndCreatorIDs.includes(rowToSave.userID),
    ),
  ];
  if (initialMemberIDs) {
    if (!initialMembersChangeset) {
      throw new ServerError('unknown_error');
    }
    toSave = [...toSave, ...initialMembersChangeset.toSave];
    toDelete = [...toDelete, ...initialMembersChangeset.toDelete];
  }
  for (let rowToSave of toSave) {
    if (
      rowToSave.role !== "0" &&
      (rowToSave.userID !== viewer.userID ||
        rowToSave.threadID !== id)
    ) {
      rowToSave.unread = true;
    }
    if (rowToSave.threadID === id && rowToSave.role !== "0") {
      const subscription = { home: true, pushNotifs: true };
      rowToSave.subscription = subscription;
    }
  }

  const messageDatas = [{
    type: messageTypes.CREATE_THREAD,
    threadID: id,
    creatorID: viewer.userID,
    time,
    initialThreadState: {
      type: threadType,
      name,
      parentThreadID,
      color,
      memberIDs: initialMemberAndCreatorIDs,
    },
  }];
  if (parentThreadID) {
    messageDatas.push({
      type: messageTypes.CREATE_SUB_THREAD,
      threadID: parentThreadID,
      creatorID: viewer.userID,
      time,
      childThreadID: id,
    });
  }

  const [ newMessageInfos, commitResult ] = await Promise.all([
    createMessages(messageDatas),
    commitMembershipChangeset(viewer, { toSave, toDelete }),
  ]);
  const { threadInfos, viewerUpdates } = commitResult;

  return {
    newThreadInfo: threadInfos[id],
    updatesResult: {
      newUpdates: viewerUpdates,
    },
    newMessageInfos,
  };
}

export default createThread;
