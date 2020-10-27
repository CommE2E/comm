// @flow

import {
  type NewThreadRequest,
  type NewThreadResponse,
  threadTypes,
  threadPermissions,
} from 'lib/types/thread-types';
import { messageTypes } from 'lib/types/message-types';
import { userRelationshipStatus } from 'lib/types/relationship-types';
import type { Viewer } from '../session/viewer';

import invariant from 'invariant';

import { generateRandomColor } from 'lib/shared/thread-utils';
import { ServerError } from 'lib/utils/errors';
import { promiseAll } from 'lib/utils/promises';
import { hasMinCodeVersion } from 'lib/shared/version-utils';

import { dbQuery, SQL } from '../database/database';
import createIDs from './id-creator';
import { createInitialRolesForNewThread } from './role-creator';
import { fetchKnownUserInfos } from '../fetchers/user-fetchers';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers';
import {
  changeRole,
  recalculateAllPermissions,
  commitMembershipChangeset,
  setJoinsToUnread,
  getRelationshipRowsForUsers,
  getParentThreadRelationshipRowsForNewUsers,
} from '../updaters/thread-permission-updaters';
import createMessages from './message-creator';

// If forceAddMembers is set, we will allow the viewer to add random users who
// they aren't friends with. We will only fail if the viewer is trying to add
// somebody who they have blocked or has blocked them. On the other hand, if
// forceAddMembers is not set, we will fail if the viewer tries to add somebody
// who they aren't friends with and doesn't have a membership row with a
// nonnegative role for the parent thread.
async function createThread(
  viewer: Viewer,
  request: NewThreadRequest,
  forceAddMembers?: boolean = false,
): Promise<NewThreadResponse> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const threadType = request.type;
  const shouldCreateRelationships =
    forceAddMembers || threadType === threadTypes.PERSONAL;
  const parentThreadID = request.parentThreadID ? request.parentThreadID : null;
  const initialMemberIDs =
    request.initialMemberIDs && request.initialMemberIDs.length > 0
      ? request.initialMemberIDs
      : null;

  if (
    threadType !== threadTypes.CHAT_SECRET &&
    threadType !== threadTypes.PERSONAL &&
    !parentThreadID
  ) {
    throw new ServerError('invalid_parameters');
  }

  const checkPromises = {};
  if (parentThreadID) {
    checkPromises.parentThreadFetch = fetchThreadInfos(
      viewer,
      SQL`t.id = ${parentThreadID}`,
    );
    checkPromises.hasParentPermission = checkThreadPermission(
      viewer,
      parentThreadID,
      threadType === threadTypes.SIDEBAR
        ? threadPermissions.CREATE_SIDEBARS
        : threadPermissions.CREATE_SUBTHREADS,
    );
  }
  if (initialMemberIDs) {
    checkPromises.fetchInitialMembers = fetchKnownUserInfos(
      viewer,
      initialMemberIDs,
    );
  }
  const {
    parentThreadFetch,
    hasParentPermission,
    fetchInitialMembers,
  } = await promiseAll(checkPromises);

  let parentThreadMembers;
  if (parentThreadID) {
    invariant(parentThreadFetch, 'parentThreadFetch should be set');
    const parentThreadInfo = parentThreadFetch.threadInfos[parentThreadID];
    if (!hasParentPermission) {
      throw new ServerError('invalid_credentials');
    }
    parentThreadMembers = parentThreadInfo.members.map(
      (userInfo) => userInfo.id,
    );
  }

  const viewerNeedsRelationshipsWith = [];
  if (fetchInitialMembers) {
    invariant(initialMemberIDs, 'should be set');
    for (const initialMemberID of initialMemberIDs) {
      const initialMember = fetchInitialMembers[initialMemberID];
      if (!initialMember && shouldCreateRelationships) {
        viewerNeedsRelationshipsWith.push(initialMemberID);
        continue;
      } else if (!initialMember) {
        throw new ServerError('invalid_credentials');
      }
      const { relationshipStatus } = initialMember;
      if (relationshipStatus === userRelationshipStatus.FRIEND) {
        continue;
      } else if (
        relationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER ||
        relationshipStatus === userRelationshipStatus.BLOCKED_VIEWER ||
        relationshipStatus === userRelationshipStatus.BOTH_BLOCKED
      ) {
        throw new ServerError('invalid_credentials');
      } else if (
        parentThreadMembers &&
        parentThreadMembers.includes(initialMemberID)
      ) {
        continue;
      } else if (!shouldCreateRelationships) {
        throw new ServerError('invalid_credentials');
      }
    }
  }

  const [id] = await createIDs('threads', 1);
  const newRoles = await createInitialRolesForNewThread(id, threadType);

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
  await dbQuery(query);

  const [
    creatorChangeset,
    initialMembersChangeset,
    recalculatePermissionsChangeset,
  ] = await Promise.all([
    changeRole(id, [viewer.userID], newRoles.creator.id),
    initialMemberIDs ? changeRole(id, initialMemberIDs, null) : undefined,
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
  if (initialMemberIDs) {
    if (!initialMembersChangeset) {
      throw new ServerError('unknown_error');
    }
    relationshipRows.push(
      ...getRelationshipRowsForUsers(
        viewer.userID,
        viewerNeedsRelationshipsWith,
      ),
    );
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

  const changeset = { membershipRows, relationshipRows };
  const { threadInfos, viewerUpdates } = await commitMembershipChangeset(
    viewer,
    changeset,
  );

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
  const newMessageInfos = await createMessages(viewer, messageDatas);

  if (hasMinCodeVersion(viewer.platformDetails, 62)) {
    return {
      newThreadID: id,
      updatesResult: {
        newUpdates: viewerUpdates,
      },
      newMessageInfos,
    };
  }

  return {
    newThreadInfo: threadInfos[id],
    updatesResult: {
      newUpdates: viewerUpdates,
    },
    newMessageInfos,
  };
}

export default createThread;
