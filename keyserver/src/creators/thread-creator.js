// @flow

import invariant from 'invariant';

import genesis from 'lib/facts/genesis.js';
import { getRolePermissionBlobs } from 'lib/permissions/thread-permissions.js';
import {
  generatePendingThreadColor,
  generateRandomColor,
} from 'lib/shared/color-utils.js';
import { isInvalidSidebarSource } from 'lib/shared/message-utils.js';
import { getThreadTypeParentRequirement } from 'lib/shared/thread-utils.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { RawMessageInfo, MessageData } from 'lib/types/message-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import {
  threadTypes,
  threadTypeIsCommunityRoot,
} from 'lib/types/thread-types-enum.js';
import {
  type ServerNewThinThreadRequest,
  type NewThreadResponse,
} from 'lib/types/thread-types.js';
import type { ServerUpdateInfo } from 'lib/types/update-types.js';
import type { UserInfos } from 'lib/types/user-types.js';
import { pushAll } from 'lib/utils/array.js';
import { ServerError } from 'lib/utils/errors.js';
import { promiseAll } from 'lib/utils/promises.js';
import { firstLine } from 'lib/utils/string-utils.js';

import createIDs from './id-creator.js';
import createMessages from './message-creator.js';
import { createInitialRolesForNewThread } from './role-creator.js';
import type { UpdatesForCurrentSession } from './update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import {
  fetchLatestEditMessageContentByID,
  fetchMessageInfoByID,
} from '../fetchers/message-fetchers.js';
import {
  determineThreadAncestry,
  personalThreadQuery,
  determineThreadAncestryForPossibleMemberResolution,
} from '../fetchers/thread-fetchers.js';
import {
  checkThreadPermission,
  validateCandidateMembers,
} from '../fetchers/thread-permission-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import {
  changeRole,
  recalculateThreadPermissions,
  commitMembershipChangeset,
  getChangesetCommitResultForExistingThread,
  type MembershipChangeset,
} from '../updaters/thread-permission-updaters.js';
import { joinThread } from '../updaters/thread-updaters.js';
import { isAuthoritativeKeyserver } from '../user/identity.js';
import RelationshipChangeset from '../utils/relationship-changeset.js';

type CreateThreadOptions = Partial<{
  +forceAddMembers: boolean,
  +updatesForCurrentSession: UpdatesForCurrentSession,
  +silentlyFailMembers: boolean,
  +dontCheckPermissions: boolean,
}>;

// If forceAddMembers is set, we will allow the viewer to add random users who
// they aren't friends with. We will only fail if the viewer is trying to add
// somebody who they have blocked or has blocked them. On the other hand, if
// forceAddMembers is not set, we will fail if the viewer tries to add somebody
// who they aren't friends with and doesn't have a membership row with a
// nonnegative role for the parent thread.
async function createThread(
  viewer: Viewer,
  request: ServerNewThinThreadRequest,
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
    forceAddMembers || threadType === threadTypes.GENESIS_PERSONAL;
  let parentThreadID = request.parentThreadID ? request.parentThreadID : null;
  const initialMemberIDsFromRequest =
    request.initialMemberIDs && request.initialMemberIDs.length > 0
      ? [...new Set(request.initialMemberIDs)]
      : null;
  const ghostMemberIDsFromRequest =
    request.ghostMemberIDs && request.ghostMemberIDs.length > 0
      ? [...new Set(request.ghostMemberIDs)]
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
    threadType === threadTypes.GENESIS_PERSONAL &&
    request.initialMemberIDs?.length !== 1
  ) {
    throw new ServerError('invalid_parameters');
  }

  const requestParentThreadID = parentThreadID;
  const confirmParentPermissionPromise = (async () => {
    if (!requestParentThreadID) {
      return;
    }
    const hasParentPermission = await checkThreadPermission(
      viewer,
      requestParentThreadID,
      threadType === threadTypes.SIDEBAR
        ? threadPermissions.CREATE_SIDEBARS
        : threadPermissions.CREATE_SUBCHANNELS,
    );
    if (!hasParentPermission) {
      throw new ServerError('invalid_credentials');
    }
  })();

  // This is a temporary hack until we release actual E2E-encrypted local
  // conversations. For now we are hosting all root threads on Ashoat's
  // keyserver, so we set them to the have the Genesis community as their
  // parent thread.
  if (!parentThreadID && !threadTypeIsCommunityRoot(threadType)) {
    const isAuthoritative = await isAuthoritativeKeyserver();
    if (!isAuthoritative) {
      throw new ServerError('invalid_parameters');
    }
    parentThreadID = genesis().id;
  }

  const determineThreadAncestryPromise = determineThreadAncestry(
    parentThreadID,
    threadType,
  );

  const validateMembersPromise = (async () => {
    const threadAncestry = await determineThreadAncestryPromise;
    const containingThreadIDForPossibleMemberResolution =
      determineThreadAncestryForPossibleMemberResolution(
        parentThreadID,
        threadAncestry.containingThreadID,
      );
    const defaultRolePermissions = getRolePermissionBlobs(threadType).Members;
    const { initialMemberIDs, ghostMemberIDs } = await validateCandidateMembers(
      viewer,
      {
        initialMemberIDs: initialMemberIDsFromRequest,
        ghostMemberIDs: ghostMemberIDsFromRequest,
      },
      {
        threadType,
        parentThreadID,
        containingThreadID: containingThreadIDForPossibleMemberResolution,
        defaultRolePermissions,
        communityID: threadAncestry.community,
      },
      { requireRelationship: !shouldCreateRelationships },
    );
    if (
      !silentlyFailMembers &&
      (Number(initialMemberIDs?.length) <
        Number(initialMemberIDsFromRequest?.length) ||
        Number(ghostMemberIDs?.length) <
          Number(ghostMemberIDsFromRequest?.length))
    ) {
      throw new ServerError('invalid_credentials');
    }
    return { initialMemberIDs, ghostMemberIDs };
  })();

  const sourceMessagePromise: Promise<?RawMessageInfo> = sourceMessageID
    ? fetchMessageInfoByID(viewer, sourceMessageID)
    : Promise.resolve(undefined);
  const {
    sourceMessage,
    threadAncestry,
    validateMembers: { initialMemberIDs, ghostMemberIDs },
  } = await promiseAll({
    sourceMessage: sourceMessagePromise,
    threadAncestry: determineThreadAncestryPromise,
    validateMembers: validateMembersPromise,
    confirmParentPermission: confirmParentPermissionPromise,
  });

  if (sourceMessage && isInvalidSidebarSource(sourceMessage)) {
    throw new ServerError('invalid_parameters');
  }

  let { id } = request;
  if (id === null || id === undefined) {
    const ids = await createIDs('threads', 1);
    id = ids[0];
  }
  const newRoles = await createInitialRolesForNewThread(id, threadType);

  const name = request.name ? firstLine(request.name) : null;
  const description = request.description ? request.description : null;
  let color = request.color
    ? request.color.toLowerCase()
    : generateRandomColor();
  if (threadType === threadTypes.GENESIS_PERSONAL) {
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
    threadAncestry.containingThreadID,
    threadAncestry.community,
    threadAncestry.depth,
    sourceMessageID,
  ];

  let existingThreadQuery = null;
  if (threadType === threadTypes.GENESIS_PERSONAL) {
    const otherMemberID = initialMemberIDs?.[0];
    invariant(
      otherMemberID,
      'Other member id should be set for a GENESIS_PERSONAL thread',
    );
    existingThreadQuery = personalThreadQuery(viewer.userID, otherMemberID);
  } else if (sourceMessageID) {
    existingThreadQuery = SQL`
      SELECT t.id
      FROM threads t
      WHERE t.source_message = ${sourceMessageID}
    `;
  }

  if (existingThreadQuery) {
    const query = SQL`
      INSERT INTO threads(id, type, name, description, creator, creation_time,
        color, parent_thread_id, containing_thread_id, community, depth,
        source_message)
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

      invariant(request.calendarQuery, 'calendar query should exist');
      const calendarQuery = {
        ...request.calendarQuery,
        filters: [
          ...request.calendarQuery.filters,
          { type: 'threads', threadIDs: [existingThreadID] },
        ],
      };

      let joinUpdateInfos: $ReadOnlyArray<ServerUpdateInfo> = [];
      let userInfos: UserInfos = {};
      let newMessageInfos: $ReadOnlyArray<RawMessageInfo> = [];
      if (threadType !== threadTypes.GENESIS_PERSONAL) {
        const joinThreadResult = await joinThread(viewer, {
          threadID: existingThreadID,
          calendarQuery,
        });
        joinUpdateInfos = joinThreadResult.updatesResult.newUpdates;
        userInfos = joinThreadResult.userInfos;
        newMessageInfos = joinThreadResult.rawMessageInfos;
      }

      const { viewerUpdates: newUpdates, userInfos: changesetUserInfos } =
        await getChangesetCommitResultForExistingThread(
          viewer,
          existingThreadID,
          joinUpdateInfos,
          { calendarQuery, updatesForCurrentSession },
        );
      userInfos = { ...userInfos, ...changesetUserInfos };

      return {
        newThreadID: existingThreadID,
        updatesResult: {
          newUpdates,
        },
        userInfos,
        newMessageInfos,
      };
    }
  } else {
    const query = SQL`
      START TRANSACTION;

      INSERT INTO threads(id, type, name, description, creator, creation_time,
        color, parent_thread_id, containing_thread_id, community, depth,
        source_message)
      VALUES ${[row]};
    `;

    if (threadTypeIsCommunityRoot(threadType)) {
      query.append(SQL`
        INSERT INTO communities (id)
        VALUES (${id});
      `);
    }

    query.append(SQL`
      COMMIT;
    `);

    await dbQuery(query, { multipleStatements: true });
  }

  const initialMemberPromise: Promise<?MembershipChangeset> = initialMemberIDs
    ? changeRole(id, initialMemberIDs, null, { setNewMembersToUnread: true })
    : Promise.resolve(undefined);
  const ghostMemberPromise: Promise<?MembershipChangeset> = ghostMemberIDs
    ? changeRole(id, ghostMemberIDs, -1)
    : Promise.resolve(undefined);

  const [
    creatorChangeset,
    initialMembersChangeset,
    ghostMembersChangeset,
    recalculatePermissionsChangeset,
  ] = await Promise.all([
    changeRole(id, [viewer.userID], newRoles.creator.id, {
      dontCheckPermissions: !!options?.dontCheckPermissions,
    }),
    initialMemberPromise,
    ghostMemberPromise,
    recalculateThreadPermissions(id),
  ]);

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
  const relationshipChangeset = new RelationshipChangeset();
  relationshipChangeset.addAll(creatorRelationshipChangeset);
  relationshipChangeset.addAll(recalculateRelationshipChangeset);

  if (initialMembersChangeset) {
    const {
      membershipRows: initialMembersMembershipRows,
      relationshipChangeset: initialMembersRelationshipChangeset,
    } = initialMembersChangeset;
    pushAll(membershipRows, initialMembersMembershipRows);
    relationshipChangeset.addAll(initialMembersRelationshipChangeset);
  }
  if (ghostMembersChangeset) {
    const {
      membershipRows: ghostMembersMembershipRows,
      relationshipChangeset: ghostMembersRelationshipChangeset,
    } = ghostMembersChangeset;
    pushAll(membershipRows, ghostMembersMembershipRows);
    relationshipChangeset.addAll(ghostMembersRelationshipChangeset);
  }

  const changeset = { membershipRows, relationshipChangeset };
  const { viewerUpdates, userInfos } = await commitMembershipChangeset(
    viewer,
    changeset,
    {
      updatesForCurrentSession,
    },
  );

  const initialMemberAndCreatorIDs = initialMemberIDs
    ? [...initialMemberIDs, viewer.userID]
    : [viewer.userID];
  const messageDatas: Array<MessageData> = [];
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
    if (!sourceMessage) {
      throw new ServerError('invalid_parameters');
    }
    invariant(
      sourceMessage.type !== messageTypes.REACTION &&
        sourceMessage.type !== messageTypes.EDIT_MESSAGE &&
        sourceMessage.type !== messageTypes.SIDEBAR_SOURCE &&
        sourceMessage.type !== messageTypes.TOGGLE_PIN,
      'Invalid sidebar source type',
    );

    let editedSourceMessage = sourceMessage;
    if (sourceMessageID && sourceMessage.type === messageTypes.TEXT) {
      const editMessageContent =
        await fetchLatestEditMessageContentByID(sourceMessageID);
      if (editMessageContent) {
        editedSourceMessage = {
          ...sourceMessage,
          text: editMessageContent.text,
        };
      }
    }

    messageDatas.push(
      {
        type: messageTypes.SIDEBAR_SOURCE,
        threadID: id,
        creatorID: viewer.userID,
        time,
        sourceMessage: editedSourceMessage,
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

  if (
    parentThreadID &&
    threadType !== threadTypes.SIDEBAR &&
    (parentThreadID !== genesis().id ||
      threadType === threadTypes.COMMUNITY_OPEN_SUBTHREAD ||
      threadType === threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD)
  ) {
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

  return {
    newThreadID: id,
    updatesResult: {
      newUpdates: viewerUpdates,
    },
    userInfos,
    newMessageInfos,
  };
}

export { createThread };
