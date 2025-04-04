// @flow

import t from 'tcomb';
import type { TInterface, TUnion } from 'tcomb';

import { threadSubscriptionValidator } from 'lib/types/subscription-types.js';
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
  type ServerNewThinThreadRequest,
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
} from 'lib/types/thread-types.js';
import { updateUserAvatarRequestValidator } from 'lib/utils/avatar-utils.js';
import { values } from 'lib/utils/objects.js';
import {
  tShape,
  tNumEnum,
  tColor,
  tPassword,
  tID,
  tUserID,
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
  updateMessagePinForThread,
} from '../updaters/thread-updaters.js';

export const threadDeletionRequestInputValidator: TInterface<ThreadDeletionRequest> =
  tShape<ThreadDeletionRequest>({
    threadID: tID,
    accountPassword: t.maybe(tPassword),
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
    memberIDs: t.list(tUserID),
    role: t.refinement(tID, str => {
      if (str.indexOf('|') !== -1) {
        str = str.split('|')[1];
      }
      const int = parseInt(str, 10);
      return String(int) === str && int > 0;
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
    memberIDs: t.list(tUserID),
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
      newMemberIDs: t.maybe(t.list(tUserID)),
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
  initialMemberIDs: t.maybe(t.list(tUserID)),
  calendarQuery: t.maybe(entryQueryInputValidator),
};
const newThreadRequestInputValidator: TUnion<ServerNewThinThreadRequest> =
  t.union([
    tShape({
      type: tNumEnum([threadTypes.SIDEBAR]),
      sourceMessageID: tID,
      ...threadRequestValidationShape,
    }),
    tShape({
      type: tNumEnum([
        threadTypes.COMMUNITY_OPEN_SUBTHREAD,
        threadTypes.COMMUNITY_SECRET_SUBTHREAD,
        threadTypes.GENESIS_PERSONAL,
        threadTypes.COMMUNITY_ROOT,
        threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
        threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD,
        threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD,
      ]),
      ...threadRequestValidationShape,
    }),
  ]);

async function threadCreationResponder(
  viewer: Viewer,
  request: ServerNewThinThreadRequest,
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
    defaultSubscription: t.maybe(threadSubscriptionValidator),
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

async function toggleMessagePinResponder(
  viewer: Viewer,
  request: ToggleMessagePinRequest,
): Promise<ToggleMessagePinResult> {
  return await updateMessagePinForThread(viewer, request, 'normal');
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
