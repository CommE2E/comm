// @flow

import invariant from 'invariant';

import bots from 'lib/facts/bots';
import { relationshipBlockedInEitherDirection } from 'lib/shared/relationship-utils';
import {
  generatePendingThreadColor,
  generateRandomColor,
  getThreadTypeParentRequirement,
} from 'lib/shared/thread-utils';
import { hasMinCodeVersion } from 'lib/shared/version-utils';
import type { Shape } from 'lib/types/core';
import { messageTypes } from 'lib/types/message-types';
import { userRelationshipStatus } from 'lib/types/relationship-types';
import {
  type ServerNewThreadRequest,
  type NewThreadResponse,
  threadTypes,
  threadPermissions,
} from 'lib/types/thread-types';
import { ServerError } from 'lib/utils/errors';
import { promiseAll } from 'lib/utils/promises';
import { firstLine } from 'lib/utils/string-utils';

import { dbQuery, SQL } from '../database/database';
import { fetchMessageInfoByID } from '../fetchers/message-fetchers';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers';
import { fetchKnownUserInfos } from '../fetchers/user-fetchers';
import type { Viewer } from '../session/viewer';
import {
  changeRole,
  recalculateThreadPermissions,
  commitMembershipChangeset,
} from '../updaters/thread-permission-updaters';
import RelationshipChangeset from '../utils/relationship-changeset';
import createIDs from './id-creator';
import createMessages from './message-creator';
import { createInitialRolesForNewThread } from './role-creator';
import type { UpdatesForCurrentSession } from './update-creator';

const { squadbot } = bots;

const privateThreadDescription =
  'This is your private thread, ' +
  'where you can set reminders and jot notes in private!';

type CreateThreadOptions = Shape<{|
  +forceAddMembers: boolean,
  +updatesForCurrentSession: UpdatesForCurrentSession,
  +silentlyFailMembers: boolean,
|}>;

// If forceAddMembers is set, we will allow the viewer to add random users who
// they aren't friends with. We will only fail if the viewer is trying to add
// somebody who they have blocked or has blocked them. On the other hand, if
// forceAddMembers is not set, we will fail if the viewer tries to add somebody
// who they aren't friends with and doesn't have a membership row with a
// nonnegative role for the parent thread.
async function createThread(
  viewer: Viewer,
  request: ServerNewThreadRequest,
  options?: CreateThreadOptions,
): Promise<NewThreadResponse> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const forceAddMembers = options?.forceAddMembers ?? false;
  const updatesForCurrentSession =
    options?.updatesForCurrentSession ?? 'return';
  const silentlyFailMembers = options?.silentlyFailMembers ?? false;

  const threadType = request.type;
  const shouldCreateRelationships =
    forceAddMembers || threadType === threadTypes.PERSONAL;
  const parentThreadID = request.parentThreadID ? request.parentThreadID : null;
  const initialMemberIDsFromRequest =
    request.initialMemberIDs && request.initialMemberIDs.length > 0
      ? request.initialMemberIDs
      : null;
  const ghostMemberIDs =
    request.ghostMemberIDs && request.ghostMemberIDs.length > 0
      ? request.ghostMemberIDs
      : null;

  const sourceMessageID = request.sourceMessageID
    ? request.sourceMessageID
    : null;
  invariant(
    threadType !== threadTypes.SIDEBAR || sourceMessageID,
    'sourceMessageID should be set for sidebar',
  );

  const parentRequirement = getThreadTypeParentRequirement(threadType);
  if (
    (parentRequirement === 'required' && !parentThreadID) ||
    (parentRequirement === 'disabled' && parentThreadID)
  ) {
    throw new ServerError('invalid_parameters');
  }

  if (
    threadType === threadTypes.PERSONAL &&
    request.initialMemberIDs?.length !== 1
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

  const memberIDs = [];
  if (initialMemberIDsFromRequest) {
    memberIDs.push(...initialMemberIDsFromRequest);
  }
  if (ghostMemberIDs) {
    memberIDs.push(...ghostMemberIDs);
  }

  if (initialMemberIDsFromRequest || ghostMemberIDs) {
    checkPromises.fetchMemberIDs = fetchKnownUserInfos(viewer, memberIDs);
  }

  if (sourceMessageID) {
    checkPromises.sourceMessage = fetchMessageInfoByID(viewer, sourceMessageID);
  }

  const {
    parentThreadFetch,
    hasParentPermission,
    fetchMemberIDs,
    sourceMessage,
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

  const relationshipChangeset = new RelationshipChangeset();
  const silencedMemberIDs = new Set();
  if (fetchMemberIDs) {
    invariant(initialMemberIDsFromRequest || ghostMemberIDs, 'should be set');
    for (const memberID of memberIDs) {
      const member = fetchMemberIDs[memberID];
      if (
        !member &&
        shouldCreateRelationships &&
        (threadType !== threadTypes.SIDEBAR ||
          parentThreadMembers?.includes(memberID))
      ) {
        continue;
      } else if (!member && silentlyFailMembers) {
        silencedMemberIDs.add(memberID);
        continue;
      } else if (!member) {
        throw new ServerError('invalid_credentials');
      }
      relationshipChangeset.setRelationshipExists(viewer.id, memberID);

      const { relationshipStatus } = member;
      const memberRelationshipHasBlock = !!(
        relationshipStatus &&
        relationshipBlockedInEitherDirection(relationshipStatus)
      );
      if (
        relationshipStatus === userRelationshipStatus.FRIEND &&
        threadType !== threadTypes.SIDEBAR
      ) {
        continue;
      } else if (memberRelationshipHasBlock && silentlyFailMembers) {
        silencedMemberIDs.add(memberID);
      } else if (memberRelationshipHasBlock) {
        throw new ServerError('invalid_credentials');
      } else if (
        parentThreadMembers &&
        parentThreadMembers.includes(memberID)
      ) {
        continue;
      } else if (!shouldCreateRelationships && silentlyFailMembers) {
        silencedMemberIDs.add(memberID);
      } else if (!shouldCreateRelationships) {
        throw new ServerError('invalid_credentials');
      }
    }
  }

  const filteredInitialMemberIDs: ?$ReadOnlyArray<string> = initialMemberIDsFromRequest?.filter(
    (id) => !silencedMemberIDs.has(id),
  );
  const initialMemberIDs =
    filteredInitialMemberIDs && filteredInitialMemberIDs.length > 0
      ? filteredInitialMemberIDs
      : null;

  const [id] = await createIDs('threads', 1);
  const newRoles = await createInitialRolesForNewThread(id, threadType);

  const name = request.name ? firstLine(request.name) : null;
  const description = request.description ? request.description : null;
  let color = request.color
    ? request.color.toLowerCase()
    : generateRandomColor();
  if (threadType === threadTypes.PERSONAL) {
    color = generatePendingThreadColor([
      ...(request.initialMemberIDs ?? []),
      viewer.id,
    ]);
  }

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
    sourceMessageID,
  ];

  let existingThreadQuery = null;
  if (threadType === threadTypes.PERSONAL) {
    const otherMemberID = initialMemberIDs?.[0];
    invariant(
      otherMemberID,
      'Other member id should be set for a PERSONAL thread',
    );
    existingThreadQuery = SQL`
      SELECT t.id 
      FROM threads t
      INNER JOIN memberships m1 
        ON m1.thread = t.id AND m1.user = ${viewer.userID}
      INNER JOIN memberships m2
        ON m2.thread = t.id AND m2.user = ${otherMemberID}
      WHERE t.type = ${threadTypes.PERSONAL}
        AND m1.role != -1
        AND m2.role != -1
    `;
  } else if (sourceMessageID) {
    existingThreadQuery = SQL`
      SELECT t.id
      FROM threads t
      WHERE t.source_message = ${sourceMessageID}
    `;
  }

  if (existingThreadQuery) {
    const query = SQL`
      INSERT INTO threads(id, type, name, description, creator,
        creation_time, color, parent_thread_id, default_role, source_message)
      SELECT ${row}
      WHERE NOT EXISTS (`;
    query.append(existingThreadQuery).append(SQL`)`);
    const [result] = await dbQuery(query);

    if (result.affectedRows === 0) {
      const deleteRoles = SQL`
        DELETE FROM roles
        WHERE id IN (${newRoles.default.id}, ${newRoles.creator.id})
      `;
      const deleteIDs = SQL`
        DELETE FROM ids
        WHERE id IN (${id}, ${newRoles.default.id}, ${newRoles.creator.id})
      `;
      const [[existingThreadResult]] = await Promise.all([
        dbQuery(existingThreadQuery),
        dbQuery(deleteRoles),
        dbQuery(deleteIDs),
      ]);
      invariant(existingThreadResult.length > 0, 'thread should exist');
      const existingThreadID = existingThreadResult[0].id.toString();

      return {
        newThreadID: existingThreadID,
        updatesResult: {
          newUpdates: [],
        },
        userInfos: {},
        newMessageInfos: [],
      };
    }
  } else {
    const query = SQL`
      INSERT INTO threads(id, type, name, description, creator,
        creation_time, color, parent_thread_id, default_role, source_message)
      VALUES ${[row]}
    `;
    await dbQuery(query);
  }

  let initialMemberPromise;
  if (initialMemberIDs) {
    initialMemberPromise = changeRole(id, initialMemberIDs, null, {
      setNewMembersToUnread: true,
    });
  }
  let ghostMemberPromise;
  if (ghostMemberIDs) {
    ghostMemberPromise = changeRole(id, ghostMemberIDs, -1);
  }

  const [
    creatorChangeset,
    initialMembersChangeset,
    ghostMembersChangeset,
    recalculatePermissionsChangeset,
  ] = await Promise.all([
    changeRole(id, [viewer.userID], newRoles.creator.id),
    initialMemberPromise,
    ghostMemberPromise,
    recalculateThreadPermissions(id, threadType),
  ]);

  if (!creatorChangeset) {
    throw new ServerError('unknown_error');
  }
  const {
    membershipRows: creatorMembershipRows,
    relationshipChangeset: creatorRelationshipChangeset,
  } = creatorChangeset;

  const {
    membershipRows: recalculateMembershipRows,
    relationshipChangeset: recalculateRelationshipChangeset,
  } = recalculatePermissionsChangeset;

  const membershipRows = [
    ...creatorMembershipRows,
    ...recalculateMembershipRows,
  ];
  relationshipChangeset.addAll(creatorRelationshipChangeset);
  relationshipChangeset.addAll(recalculateRelationshipChangeset);

  if (initialMembersChangeset) {
    const {
      membershipRows: initialMembersMembershipRows,
      relationshipChangeset: initialMembersRelationshipChangeset,
    } = initialMembersChangeset;
    membershipRows.push(...initialMembersMembershipRows);
    relationshipChangeset.addAll(initialMembersRelationshipChangeset);
  }
  if (ghostMembersChangeset) {
    const {
      membershipRows: ghostMembersMembershipRows,
      relationshipChangeset: ghostMembersRelationshipChangeset,
    } = ghostMembersChangeset;
    membershipRows.push(...ghostMembersMembershipRows);
    relationshipChangeset.addAll(ghostMembersRelationshipChangeset);
  }

  const changeset = { membershipRows, relationshipChangeset };
  const {
    threadInfos,
    viewerUpdates,
    userInfos,
  } = await commitMembershipChangeset(viewer, changeset, {
    updatesForCurrentSession,
  });

  const initialMemberAndCreatorIDs = initialMemberIDs
    ? [...initialMemberIDs, viewer.userID]
    : [viewer.userID];
  const messageDatas = [];
  if (threadType !== threadTypes.SIDEBAR) {
    messageDatas.push({
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
    });
  } else {
    invariant(parentThreadID, 'parentThreadID should be set for sidebar');
    if (!sourceMessage || sourceMessage.type === messageTypes.SIDEBAR_SOURCE) {
      throw new ServerError('invalid_parameters');
    }

    messageDatas.push(
      {
        type: messageTypes.SIDEBAR_SOURCE,
        threadID: id,
        creatorID: viewer.userID,
        time,
        sourceMessage,
      },
      {
        type: messageTypes.CREATE_SIDEBAR,
        threadID: id,
        creatorID: viewer.userID,
        time,
        sourceMessageAuthorID: sourceMessage.creatorID,
        initialThreadState: {
          name,
          parentThreadID,
          color,
          memberIDs: initialMemberAndCreatorIDs,
        },
      },
    );
  }

  if (parentThreadID && threadType !== threadTypes.SIDEBAR) {
    messageDatas.push({
      type: messageTypes.CREATE_SUB_THREAD,
      threadID: parentThreadID,
      creatorID: viewer.userID,
      time,
      childThreadID: id,
    });
  }
  const newMessageInfos = await createMessages(
    viewer,
    messageDatas,
    updatesForCurrentSession,
  );

  if (hasMinCodeVersion(viewer.platformDetails, 62)) {
    return {
      newThreadID: id,
      updatesResult: {
        newUpdates: viewerUpdates,
      },
      userInfos,
      newMessageInfos,
    };
  }

  return {
    newThreadInfo: threadInfos[id],
    updatesResult: {
      newUpdates: viewerUpdates,
    },
    userInfos,
    newMessageInfos,
  };
}

function createPrivateThread(
  viewer: Viewer,
  username: string,
): Promise<NewThreadResponse> {
  return createThread(
    viewer,
    {
      type: threadTypes.PRIVATE,
      name: username,
      description: privateThreadDescription,
      ghostMemberIDs: [squadbot.userID],
    },
    {
      forceAddMembers: true,
    },
  );
}

export { createThread, createPrivateThread, privateThreadDescription };
