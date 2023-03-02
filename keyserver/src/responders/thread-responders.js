// @flow

import t from 'tcomb';
import type { TUnion, TInterface } from 'tcomb';

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
  threadTypes,
} from 'lib/types/thread-types.js';
import { updateUserAvatarRequestValidator } from 'lib/utils/avatar-utils.js';
import { values } from 'lib/utils/objects.js';
import {
  tShape,
  tNumEnum,
  tColor,
  tPassword,
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
import { validateInput } from '../utils/validation-utils.js';

const threadDeletionRequestInputValidator = tShape({
  threadID: t.String,
  accountPassword: t.maybe(tPassword),
});

async function threadDeletionResponder(
  viewer: Viewer,
  input: any,
): Promise<LeaveThreadResult> {
  const request: ThreadDeletionRequest = input;
  await validateInput(viewer, threadDeletionRequestInputValidator, request);
  return await deleteThread(viewer, request);
}

const roleChangeRequestInputValidator = tShape({
  threadID: t.String,
  memberIDs: t.list(t.String),
  role: t.refinement(t.String, str => {
    const int = parseInt(str, 10);
    return String(int) === str && int > 0;
  }),
});

async function roleUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<ChangeThreadSettingsResult> {
  const request: RoleChangeRequest = input;
  await validateInput(viewer, roleChangeRequestInputValidator, request);
  return await updateRole(viewer, request);
}

const removeMembersRequestInputValidator = tShape({
  threadID: t.String,
  memberIDs: t.list(t.String),
});

async function memberRemovalResponder(
  viewer: Viewer,
  input: any,
): Promise<ChangeThreadSettingsResult> {
  const request: RemoveMembersRequest = input;
  await validateInput(viewer, removeMembersRequestInputValidator, request);
  return await removeMembers(viewer, request);
}

const leaveThreadRequestInputValidator = tShape({
  threadID: t.String,
});

async function threadLeaveResponder(
  viewer: Viewer,
  input: any,
): Promise<LeaveThreadResult> {
  const request: LeaveThreadRequest = input;
  await validateInput(viewer, leaveThreadRequestInputValidator, request);
  return await leaveThread(viewer, request);
}

const updateThreadRequestInputValidator = tShape({
  threadID: t.String,
  changes: tShape({
    type: t.maybe(tNumEnum(values(threadTypes))),
    name: t.maybe(t.String),
    description: t.maybe(t.String),
    color: t.maybe(tColor),
    parentThreadID: t.maybe(t.String),
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
  return await updateThread(viewer, request);
}

const threadRequestValidationShape = {
  name: t.maybe(t.String),
  description: t.maybe(t.String),
  color: t.maybe(tColor),
  parentThreadID: t.maybe(t.String),
  initialMemberIDs: t.maybe(t.list(t.String)),
  calendarQuery: t.maybe(entryQueryInputValidator),
};
const newThreadRequestInputValidator: TUnion<TInterface> = t.union([
  tShape({
    type: tNumEnum([threadTypes.SIDEBAR]),
    sourceMessageID: t.String,
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
async function threadCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<NewThreadResponse> {
  const request: ServerNewThreadRequest = input;
  await validateInput(viewer, newThreadRequestInputValidator, request);

  return await createThread(viewer, request, {
    silentlyFailMembers: request.type === threadTypes.SIDEBAR,
  });
}

const joinThreadRequestInputValidator = tShape({
  threadID: t.String,
  calendarQuery: t.maybe(entryQueryInputValidator),
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

  return await joinThread(viewer, request);
}

const threadFetchMediaRequestInputValidator = tShape({
  threadID: t.String,
  limit: t.Number,
  offset: t.Number,
});
async function threadFetchMediaResponder(
  viewer: Viewer,
  input: any,
): Promise<ThreadFetchMediaResult> {
  const request: ThreadFetchMediaRequest = input;
  await validateInput(viewer, threadFetchMediaRequestInputValidator, request);
  return await fetchMediaForThread(viewer, request);
}

const toggleMessagePinRequestInputValidator = tShape({
  messageID: t.String,
  action: t.enums.of(['pin', 'unpin']),
});
async function toggleMessagePinResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  const request: ToggleMessagePinRequest = input;
  await validateInput(viewer, toggleMessagePinRequestInputValidator, request);
  await toggleMessagePinForThread(viewer, request);
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
