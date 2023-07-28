// @flow

import t from 'tcomb';
import type { TInterface, TUnion } from 'tcomb';

import { mediaValidator } from 'lib/types/media-types.js';
import {
  rawMessageInfoValidator,
  messageTruncationStatusesValidator,
} from 'lib/types/message-types.js';
import { userSurfacedPermissionValidator } from 'lib/types/thread-permission-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import {
  type ThreadDeletionRequest,
  type RoleChangeRequest,
  type ChangeThreadSettingsResult,
  type RemoveMembersRequest,
  type LeaveThreadRequest,
  type LeaveThreadResult,
  type UpdateThreadRequest,
  type ServerNewThreadRequest,
  type NewThreadResponse,
  type ServerThreadJoinRequest,
  type ThreadJoinResult,
  type ThreadFetchMediaResult,
  type ThreadFetchMediaRequest,
  type ToggleMessagePinRequest,
  type ToggleMessagePinResult,
  type RoleModificationRequest,
  type RoleModificationResult,
  type RoleDeletionRequest,
  type RoleDeletionResult,
  rawThreadInfoValidator,
} from 'lib/types/thread-types.js';
import { serverUpdateInfoValidator } from 'lib/types/update-types.js';
import { userInfosValidator } from 'lib/types/user-types.js';
import { updateUserAvatarRequestValidator } from 'lib/utils/avatar-utils.js';
import { values } from 'lib/utils/objects.js';
import {
  tShape,
  tNumEnum,
  tColor,
  tPassword,
  tID,
} from 'lib/utils/validation-utils.js';

import {
  entryQueryInputValidator,
  verifyCalendarQueryThreadIDs,
} from './entry-responders.js';
import { modifyRole } from '../creators/role-creator.js';
import { createThread } from '../creators/thread-creator.js';
import { deleteRole } from '../deleters/role-deleters.js';
import { deleteThread } from '../deleters/thread-deleters.js';
import { fetchMediaForThread } from '../fetchers/upload-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import {
  updateRole,
  removeMembers,
  leaveThread,
  updateThread,
  joinThread,
  toggleMessagePinForThread,
} from '../updaters/thread-updaters.js';

export const threadDeletionRequestInputValidator: TInterface<ThreadDeletionRequest> =
  tShape<ThreadDeletionRequest>({
    threadID: tID,
    accountPassword: t.maybe(tPassword),
  });

export const leaveThreadResultValidator: TInterface<LeaveThreadResult> =
  tShape<LeaveThreadResult>({
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });

async function threadDeletionResponder(
  viewer: Viewer,
  request: ThreadDeletionRequest,
): Promise<LeaveThreadResult> {
  return await deleteThread(viewer, request);
}

export const roleChangeRequestInputValidator: TInterface<RoleChangeRequest> =
  tShape<RoleChangeRequest>({
    threadID: tID,
    memberIDs: t.list(t.String),
    role: t.refinement(tID, str => {
      if (str.indexOf('|') !== -1) {
        str = str.split('|')[1];
      }
      const int = parseInt(str, 10);
      return String(int) === str && int > 0;
    }),
  });

export const changeThreadSettingsResultValidator: TInterface<ChangeThreadSettingsResult> =
  tShape<ChangeThreadSettingsResult>({
    newMessageInfos: t.list(rawMessageInfoValidator),
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });

async function roleUpdateResponder(
  viewer: Viewer,
  request: RoleChangeRequest,
): Promise<ChangeThreadSettingsResult> {
  return await updateRole(viewer, request);
}

export const removeMembersRequestInputValidator: TInterface<RemoveMembersRequest> =
  tShape<RemoveMembersRequest>({
    threadID: tID,
    memberIDs: t.list(t.String),
  });

async function memberRemovalResponder(
  viewer: Viewer,
  request: RemoveMembersRequest,
): Promise<ChangeThreadSettingsResult> {
  return await removeMembers(viewer, request);
}

export const leaveThreadRequestInputValidator: TInterface<LeaveThreadRequest> =
  tShape<LeaveThreadRequest>({
    threadID: tID,
  });

async function threadLeaveResponder(
  viewer: Viewer,
  request: LeaveThreadRequest,
): Promise<LeaveThreadResult> {
  return await leaveThread(viewer, request);
}

export const updateThreadRequestInputValidator: TInterface<UpdateThreadRequest> =
  tShape<UpdateThreadRequest>({
    threadID: tID,
    changes: tShape({
      type: t.maybe(tNumEnum(values(threadTypes))),
      name: t.maybe(t.String),
      description: t.maybe(t.String),
      color: t.maybe(tColor),
      parentThreadID: t.maybe(tID),
      newMemberIDs: t.maybe(t.list(t.String)),
      avatar: t.maybe(updateUserAvatarRequestValidator),
    }),
    accountPassword: t.maybe(tPassword),
  });

async function threadUpdateResponder(
  viewer: Viewer,
  request: UpdateThreadRequest,
): Promise<ChangeThreadSettingsResult> {
  return await updateThread(viewer, request);
}

const threadRequestValidationShape = {
  name: t.maybe(t.String),
  description: t.maybe(t.String),
  color: t.maybe(tColor),
  parentThreadID: t.maybe(tID),
  initialMemberIDs: t.maybe(t.list(t.String)),
  calendarQuery: t.maybe(entryQueryInputValidator),
};
const newThreadRequestInputValidator: TUnion<ServerNewThreadRequest> = t.union([
  tShape({
    type: tNumEnum([threadTypes.SIDEBAR]),
    sourceMessageID: tID,
    ...threadRequestValidationShape,
  }),
  tShape({
    type: tNumEnum([
      threadTypes.COMMUNITY_OPEN_SUBTHREAD,
      threadTypes.COMMUNITY_SECRET_SUBTHREAD,
      threadTypes.PERSONAL,
      threadTypes.LOCAL,
      threadTypes.COMMUNITY_ROOT,
      threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
    ]),
    ...threadRequestValidationShape,
  }),
]);

export const newThreadResponseValidator: TInterface<NewThreadResponse> =
  tShape<NewThreadResponse>({
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
    newMessageInfos: t.list(rawMessageInfoValidator),
    userInfos: userInfosValidator,
    newThreadID: tID,
  });

async function threadCreationResponder(
  viewer: Viewer,
  request: ServerNewThreadRequest,
): Promise<NewThreadResponse> {
  return await createThread(viewer, request, {
    silentlyFailMembers: request.type === threadTypes.SIDEBAR,
  });
}

export const joinThreadRequestInputValidator: TInterface<ServerThreadJoinRequest> =
  tShape<ServerThreadJoinRequest>({
    threadID: tID,
    calendarQuery: t.maybe(entryQueryInputValidator),
    inviteLinkSecret: t.maybe(t.String),
  });

export const threadJoinResultValidator: TInterface<ThreadJoinResult> =
  tShape<ThreadJoinResult>({
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
    rawMessageInfos: t.list(rawMessageInfoValidator),
    truncationStatuses: messageTruncationStatusesValidator,
    userInfos: userInfosValidator,
  });

async function threadJoinResponder(
  viewer: Viewer,
  request: ServerThreadJoinRequest,
): Promise<ThreadJoinResult> {
  if (request.calendarQuery) {
    await verifyCalendarQueryThreadIDs(request.calendarQuery);
  }

  return await joinThread(viewer, request);
}

export const threadFetchMediaRequestInputValidator: TInterface<ThreadFetchMediaRequest> =
  tShape<ThreadFetchMediaRequest>({
    threadID: tID,
    limit: t.Number,
    offset: t.Number,
  });

export const threadFetchMediaResultValidator: TInterface<ThreadFetchMediaResult> =
  tShape<ThreadFetchMediaResult>({ media: t.list(mediaValidator) });

async function threadFetchMediaResponder(
  viewer: Viewer,
  request: ThreadFetchMediaRequest,
): Promise<ThreadFetchMediaResult> {
  return await fetchMediaForThread(viewer, request);
}

export const toggleMessagePinRequestInputValidator: TInterface<ToggleMessagePinRequest> =
  tShape<ToggleMessagePinRequest>({
    messageID: tID,
    action: t.enums.of(['pin', 'unpin']),
  });

export const toggleMessagePinResultValidator: TInterface<ToggleMessagePinResult> =
  tShape<ToggleMessagePinResult>({
    newMessageInfos: t.list(rawMessageInfoValidator),
    threadID: tID,
  });

async function toggleMessagePinResponder(
  viewer: Viewer,
  request: ToggleMessagePinRequest,
): Promise<ToggleMessagePinResult> {
  return await toggleMessagePinForThread(viewer, request);
}

export const roleModificationRequestInputValidator: TUnion<RoleModificationRequest> =
  t.union([
    tShape({
      community: tID,
      name: t.String,
      permissions: t.list(userSurfacedPermissionValidator),
      action: t.enums.of(['create_role']),
    }),
    tShape({
      community: tID,
      existingRoleID: tID,
      name: t.String,
      permissions: t.list(userSurfacedPermissionValidator),
      action: t.enums.of(['edit_role']),
    }),
  ]);

export const roleModificationResultValidator: TInterface<RoleModificationResult> =
  tShape<RoleModificationResult>({
    threadInfo: t.maybe(rawThreadInfoValidator),
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });

async function roleModificationResponder(
  viewer: Viewer,
  request: RoleModificationRequest,
): Promise<RoleModificationResult> {
  return await modifyRole(viewer, request);
}

export const roleDeletionRequestInputValidator: TInterface<RoleDeletionRequest> =
  tShape<RoleDeletionRequest>({
    community: tID,
    roleID: tID,
  });

export const roleDeletionResultValidator: TInterface<RoleDeletionResult> =
  tShape<RoleDeletionResult>({
    threadInfo: t.maybe(rawThreadInfoValidator),
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });

async function roleDeletionResponder(
  viewer: Viewer,
  request: RoleDeletionRequest,
): Promise<RoleDeletionResult> {
  return await deleteRole(viewer, request);
}

export {
  threadDeletionResponder,
  roleUpdateResponder,
  memberRemovalResponder,
  threadLeaveResponder,
  threadUpdateResponder,
  threadCreationResponder,
  threadJoinResponder,
  threadFetchMediaResponder,
  newThreadRequestInputValidator,
  toggleMessagePinResponder,
  roleModificationResponder,
  roleDeletionResponder,
};
