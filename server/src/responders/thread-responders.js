// @flow

import {
  type ThreadDeletionRequest,
  type RoleChangeRequest,
  type ChangeThreadSettingsResult,
  type RemoveMembersRequest,
  type LeaveThreadRequest,
  type LeaveThreadResult,
  type UpdateThreadRequest,
  type NewThreadRequest,
  type NewThreadResult,
  type ServerThreadJoinRequest,
  type ThreadJoinResult,
  assertThreadType,
} from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { ServerError } from 'lib/utils/errors';

import {
  validateInput,
  tShape,
  tNumEnum,
  tColor,
} from '../utils/validation-utils';
import { deleteThread } from '../deleters/thread-deleters';
import {
  updateRole,
  removeMembers,
  leaveThread,
  updateThread,
  joinThread,
} from '../updaters/thread-updaters';
import createThread from '../creators/thread-creator';
import {
  entryQueryInputValidator,
  verifyCalendarQueryThreadIDs,
} from './entry-responders';

const threadDeletionRequestInputValidator = tShape({
  threadID: t.String,
  accountPassword: t.String,
});

async function threadDeletionResponder(
  viewer: Viewer,
  input: any,
): Promise<LeaveThreadResult> {
  const request: ThreadDeletionRequest = input;
  validateInput(threadDeletionRequestInputValidator, request);
  return await deleteThread(viewer, request);
}

const roleChangeRequestInputValidator = tShape({
  threadID: t.String,
  memberIDs: t.list(t.String),
  role: t.refinement(
    t.String,
    str => {
      const int = parseInt(str);
      return int == str && int > 0;
    },
  ),
});

async function roleUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<ChangeThreadSettingsResult> {
  const request: RoleChangeRequest = input;
  validateInput(roleChangeRequestInputValidator, request);
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
  validateInput(removeMembersRequestInputValidator, request);
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
  validateInput(leaveThreadRequestInputValidator, request);
  return await leaveThread(viewer, request);
}

const updateThreadRequestInputValidator = tShape({
  threadID: t.String,
  changes: tShape({
    type: t.maybe(tNumEnum(assertThreadType)),
    visibilityRules: t.maybe(tNumEnum(assertThreadType)),
    name: t.maybe(t.String),
    description: t.maybe(t.String),
    color: t.maybe(tColor),
    parentThreadID: t.maybe(t.String),
    newMemberIDs: t.maybe(t.list(t.String)),
  }),
  accountPassword: t.maybe(t.String),
});

async function threadUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<ChangeThreadSettingsResult> {
  validateInput(updateThreadRequestInputValidator, input);
  let request;
  if (
    input.changes.visibilityRules !== null &&
    input.changes.visibilityRules !== undefined &&
    (input.changes.type === null ||
      input.changes.type === undefined)
  ) {
    request = ({
      ...input,
      changes: {
        type: input.changes.visibilityRules,
        name: input.changes.name,
        description: input.changes.description,
        color: input.changes.color,
        parentThreadID: input.changes.parentThreadID,
        newMemberIDs: input.changes.newMemberIDs,
      },
    }: UpdateThreadRequest);
  } else if (
    input.changes.visibilityRules !== null &&
    input.changes.visibilityRules !== undefined
  ) {
    request = ({
      ...input,
      changes: {
        type: input.changes.type,
        name: input.changes.name,
        description: input.changes.description,
        color: input.changes.color,
        parentThreadID: input.changes.parentThreadID,
        newMemberIDs: input.changes.newMemberIDs,
      },
    }: UpdateThreadRequest);
  } else {
    request = (input: UpdateThreadRequest);
  }
  return await updateThread(viewer, request);
}

const newThreadRequestInputValidator = tShape({
  type: t.maybe(tNumEnum(assertThreadType)),
  visibilityRules: t.maybe(tNumEnum(assertThreadType)),
  name: t.maybe(t.String),
  description: t.maybe(t.String),
  color: t.maybe(tColor),
  parentThreadID: t.maybe(t.String),
  initialMemberIDs: t.maybe(t.list(t.String)),
});
async function threadCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<NewThreadResult> {
  validateInput(newThreadRequestInputValidator, input);
  let request;
  if (
    (input.visibilityRules === null ||
      input.visibilityRules === undefined) &&
    (input.type === null || input.type === undefined)
  ) {
    throw new ServerError('invalid_parameters');
  } else if (input.type === null || input.type === undefined) {
    request = ({
      type: input.visibilityRules,
      name: input.name,
      description: input.description,
      color: input.color,
      parentThreadID: input.parentThreadID,
      initialMemberIDs: input.initialMemberIDs,
    }: NewThreadRequest);
  } else {
    request = (input: NewThreadRequest);
  }
  return await createThread(viewer, request);
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
  validateInput(joinThreadRequestInputValidator, request);

  if (request.calendarQuery) {
    await verifyCalendarQueryThreadIDs(request.calendarQuery);
  }

  return await joinThread(viewer, request);
}

export {
  threadDeletionResponder,
  roleUpdateResponder,
  memberRemovalResponder,
  threadLeaveResponder,
  threadUpdateResponder,
  threadCreationResponder,
  threadJoinResponder,
};
