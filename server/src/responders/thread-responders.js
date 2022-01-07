// @flow

import t from 'tcomb';
import type { TUnion, TInterface } from 'tcomb';

import { threadTypes } from 'lib/types/thread-types';
import {
  type ThreadDeletionRequest,
  type RoleChangeRequest,
  type ChangeThreadSettingsResult,
  changeThreadSettingsResultValidator,
  type RemoveMembersRequest,
  type LeaveThreadRequest,
  type LeaveThreadResult,
  leaveThreadResultValidator,
  type UpdateThreadRequest,
  type ServerNewThreadRequest,
  type NewThreadResponse,
  newThreadResponseValidator,
  type ServerThreadJoinRequest,
  type ThreadJoinResult,
  threadJoinResultValidator,
} from 'lib/types/thread-types-api';
import { values } from 'lib/utils/objects';
import {
  tShape,
  tNumEnum,
  tColor,
  tPassword,
} from 'lib/utils/validation-utils';

import { createThread } from '../creators/thread-creator';
import { deleteThread } from '../deleters/thread-deleters';
import type { Viewer } from '../session/viewer';
import {
  updateRole,
  removeMembers,
  leaveThread,
  updateThread,
  joinThread,
} from '../updaters/thread-updaters';
import {
  validateInput,
  validateAndConvertOutput,
} from '../utils/validation-utils';
import {
  entryQueryInputValidator,
  verifyCalendarQueryThreadIDs,
} from './entry-responders';

const threadDeletionRequestInputValidator = tShape({
  threadID: t.String,
  accountPassword: tPassword,
});

async function threadDeletionResponder(
  viewer: Viewer,
  input: any,
): Promise<LeaveThreadResult> {
  const request: ThreadDeletionRequest = input;
  await validateInput(viewer, threadDeletionRequestInputValidator, request);
  const response = await deleteThread(viewer, request);
  return validateAndConvertOutput(viewer, leaveThreadResultValidator, response);
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
  const response = await updateRole(viewer, request);
  return validateAndConvertOutput(
    viewer,
    changeThreadSettingsResultValidator,
    response,
  );
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
  const response = await removeMembers(viewer, request);
  return validateAndConvertOutput(
    viewer,
    changeThreadSettingsResultValidator,
    response,
  );
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
  const response = await leaveThread(viewer, request);
  return validateAndConvertOutput(viewer, leaveThreadResultValidator, response);
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
  }),
  accountPassword: t.maybe(tPassword),
});

async function threadUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<ChangeThreadSettingsResult> {
  const request: UpdateThreadRequest = input;
  await validateInput(viewer, updateThreadRequestInputValidator, request);
  const response = await updateThread(viewer, request);
  return validateAndConvertOutput(
    viewer,
    changeThreadSettingsResultValidator,
    response,
  );
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

  const response = await createThread(viewer, request, {
    silentlyFailMembers: request.type === threadTypes.SIDEBAR,
  });
  return validateAndConvertOutput(viewer, newThreadResponseValidator, response);
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

  const response = await joinThread(viewer, request);
  return validateAndConvertOutput(viewer, threadJoinResultValidator, response);
}

export {
  threadDeletionResponder,
  roleUpdateResponder,
  memberRemovalResponder,
  threadLeaveResponder,
  threadUpdateResponder,
  threadCreationResponder,
  threadJoinResponder,
  newThreadRequestInputValidator,
};
