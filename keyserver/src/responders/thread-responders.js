// @flow

import t from 'tcomb';
import type { TInterface, TUnion } from 'tcomb';

import { rawEntryInfoValidator } from 'lib/types/entry-types.js';
import { mediaValidator } from 'lib/types/media-types.js';
import {
  rawMessageInfoValidator,
  messageTruncationStatusesValidator,
} from 'lib/types/message-types.js';
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
  threadTypes,
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
import { createThread } from '../creators/thread-creator.js';
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
import { validateInput, validateOutput } from '../utils/validation-utils.js';

const threadDeletionRequestInputValidator = tShape({
  threadID: tID,
  accountPassword: t.maybe(tPassword),
});

export const leaveThreadResultValidator: TInterface<LeaveThreadResult> =
  tShape<LeaveThreadResult>({
    threadInfos: t.maybe(t.dict(tID, rawThreadInfoValidator)),
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });

async function threadDeletionResponder(
  viewer: Viewer,
  input: any,
): Promise<LeaveThreadResult> {
  const request: ThreadDeletionRequest = input;
  await validateInput(viewer, threadDeletionRequestInputValidator, request);
  const result = await deleteThread(viewer, request);
  return validateOutput(viewer, leaveThreadResultValidator, result);
}

const roleChangeRequestInputValidator = tShape({
  threadID: tID,
  memberIDs: t.list(t.String),
  role: t.refinement(t.String, str => {
    const int = parseInt(str, 10);
    return String(int) === str && int > 0;
  }),
});

export const changeThreadSettingsResultValidator: TInterface<ChangeThreadSettingsResult> =
  tShape<ChangeThreadSettingsResult>({
    newMessageInfos: t.list(rawMessageInfoValidator),
    threadInfo: t.maybe(rawThreadInfoValidator),
    threadInfos: t.maybe(t.dict(tID, rawThreadInfoValidator)),
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });

async function roleUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<ChangeThreadSettingsResult> {
  const request: RoleChangeRequest = input;
  await validateInput(viewer, roleChangeRequestInputValidator, request);
  const result = await updateRole(viewer, request);
  return validateOutput(viewer, changeThreadSettingsResultValidator, result);
}

const removeMembersRequestInputValidator = tShape({
  threadID: tID,
  memberIDs: t.list(t.String),
});

async function memberRemovalResponder(
  viewer: Viewer,
  input: any,
): Promise<ChangeThreadSettingsResult> {
  const request: RemoveMembersRequest = input;
  await validateInput(viewer, removeMembersRequestInputValidator, request);
  const result = await removeMembers(viewer, request);
  return validateOutput(viewer, changeThreadSettingsResultValidator, result);
}

const leaveThreadRequestInputValidator = tShape({
  threadID: tID,
});

async function threadLeaveResponder(
  viewer: Viewer,
  input: any,
): Promise<LeaveThreadResult> {
  const request: LeaveThreadRequest = input;
  await validateInput(viewer, leaveThreadRequestInputValidator, request);
  const result = await leaveThread(viewer, request);
  return validateOutput(viewer, leaveThreadResultValidator, result);
}

const updateThreadRequestInputValidator = tShape({
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
  input: any,
): Promise<ChangeThreadSettingsResult> {
  const request: UpdateThreadRequest = input;
  await validateInput(viewer, updateThreadRequestInputValidator, request);
  const result = await updateThread(viewer, request);
  return validateOutput(viewer, changeThreadSettingsResultValidator, result);
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
    newThreadInfo: t.maybe(rawThreadInfoValidator),
    userInfos: userInfosValidator,
    newThreadID: t.maybe(tID),
  });

async function threadCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<NewThreadResponse> {
  const request: ServerNewThreadRequest = input;
  await validateInput(viewer, newThreadRequestInputValidator, request);

  const result = await createThread(viewer, request, {
    silentlyFailMembers: request.type === threadTypes.SIDEBAR,
  });
  return validateOutput(viewer, newThreadResponseValidator, result);
}

const joinThreadRequestInputValidator = tShape({
  threadID: tID,
  calendarQuery: t.maybe(entryQueryInputValidator),
  inviteLinkSecret: t.maybe(t.String),
});

export const threadJoinResultValidator: TInterface<ThreadJoinResult> =
  tShape<ThreadJoinResult>({
    threadInfos: t.maybe(t.dict(tID, rawThreadInfoValidator)),
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
    rawMessageInfos: t.list(rawMessageInfoValidator),
    truncationStatuses: messageTruncationStatusesValidator,
    userInfos: userInfosValidator,
    rawEntryInfos: t.maybe(t.list(rawEntryInfoValidator)),
  });

async function threadJoinResponder(
  viewer: Viewer,
  input: any,
): Promise<ThreadJoinResult> {
  const request: ServerThreadJoinRequest = input;
  await validateInput(viewer, joinThreadRequestInputValidator, request);

  if (request.calendarQuery) {
    await verifyCalendarQueryThreadIDs(request.calendarQuery);
  }

  const result = await joinThread(viewer, request);
  return validateOutput(viewer, threadJoinResultValidator, result);
}

const threadFetchMediaRequestInputValidator = tShape({
  threadID: tID,
  limit: t.Number,
  offset: t.Number,
});

export const threadFetchMediaResultValidator: TInterface<ThreadFetchMediaResult> =
  tShape<ThreadFetchMediaResult>({ media: t.list(mediaValidator) });

async function threadFetchMediaResponder(
  viewer: Viewer,
  input: any,
): Promise<ThreadFetchMediaResult> {
  const request: ThreadFetchMediaRequest = input;
  await validateInput(viewer, threadFetchMediaRequestInputValidator, request);
  const result = await fetchMediaForThread(viewer, request);
  return validateOutput(viewer, threadFetchMediaResultValidator, result);
}

const toggleMessagePinRequestInputValidator = tShape({
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
  input: any,
): Promise<ToggleMessagePinResult> {
  const request: ToggleMessagePinRequest = input;
  await validateInput(viewer, toggleMessagePinRequestInputValidator, request);
  const result = await toggleMessagePinForThread(viewer, request);
  return validateOutput(viewer, toggleMessagePinResultValidator, result);
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
};
