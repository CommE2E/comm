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

import { dbQuery, SQL } from '../database';
import { checkThreadPermission } from '../fetchers/thread-fetchers';
import createIDs from './id-creator';
import { createInitialRolesForNewThread } from './role-creator';
import { verifyUserIDs } from '../fetchers/user-fetchers';
import {
  changeRole,
  recalculateAllPermissions,
  commitMembershipChangeset,
  setJoinsToUnread,
  getParentThreadRelationshipRowsForNewUsers,
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
  if (threadType !== threadTypes.CHAT_SECRET && !request.parentThreadID) {
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

  const [id] = await createIDs('threads', 1);
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
  const [initialMemberIDs] = await Promise.all([
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
  const {
    membershipRows: creatorMembershipRows,
    relationshipRows: creatorRelationshipRows,
  } = creatorChangeset;

  const initialMemberAndCreatorIDs = initialMemberIDs
    ? [...initialMemberIDs, viewer.userID]
    : [viewer.userID];
  const {
    membershipRows: recalculateMembershipRows,
    relationshipRows: recalculateRelationshipRows,
  } = recalculatePermissionsChangeset;

  const membershipRows = [
    ...creatorMembershipRows,
    ...recalculateMembershipRows,
  ];
  const relationshipRows = [
    ...creatorRelationshipRows,
    ...recalculateRelationshipRows,
  ];
  if (initialMemberIDs && initialMemberIDs.length > 0) {
    if (!initialMembersChangeset) {
      throw new ServerError('unknown_error');
    }
    const {
      membershipRows: initialMembersMembershipRows,
      relationshipRows: initialMembersRelationshipRows,
    } = initialMembersChangeset;
    const parentRelationshipRows = getParentThreadRelationshipRowsForNewUsers(
      id,
      recalculateMembershipRows,
      initialMemberAndCreatorIDs,
    );
    membershipRows.push(...initialMembersMembershipRows);
    relationshipRows.push(
      ...initialMembersRelationshipRows,
      ...parentRelationshipRows,
    );
  }
  setJoinsToUnread(membershipRows, viewer.userID, id);

  const messageDatas = [
    {
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
    },
  ];
  if (parentThreadID) {
    messageDatas.push({
      type: messageTypes.CREATE_SUB_THREAD,
      threadID: parentThreadID,
      creatorID: viewer.userID,
      time,
      childThreadID: id,
    });
  }

  const changeset = { membershipRows, relationshipRows };
  const [newMessageInfos, commitResult] = await Promise.all([
    createMessages(viewer, messageDatas),
    commitMembershipChangeset(viewer, changeset),
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
