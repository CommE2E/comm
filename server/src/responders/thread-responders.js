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
  type ThreadJoinRequest,
  type ThreadJoinResult,
  assertVisibilityRules,
} from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

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

const threadDeletionRequestInputValidator = tShape({
  threadID: t.String,
  accountPassword: t.String,
});

async function threadDeletionResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  const request: ThreadDeletionRequest = input;
  validateInput(threadDeletionRequestInputValidator, request);
  await deleteThread(viewer, request);
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
    name: t.maybe(t.String),
    description: t.maybe(t.String),
    color: t.maybe(tColor),
    password: t.maybe(t.String),
    parentThreadID: t.maybe(t.String),
    visibilityRules: t.maybe(tNumEnum(assertVisibilityRules)),
    newMemberIDs: t.maybe(t.list(t.String)),
  }),
  accountPassword: t.maybe(t.String),
});

async function threadUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<ChangeThreadSettingsResult> {
  const request: UpdateThreadRequest = input;
  validateInput(updateThreadRequestInputValidator, request);
  return await updateThread(viewer, request);
}

const newThreadRequestInputValidator = tShape({
  name: t.maybe(t.String),
  description: t.maybe(t.String),
  color: t.maybe(tColor),
  password: t.maybe(t.String),
  parentThreadID: t.maybe(t.String),
  visibilityRules: tNumEnum(assertVisibilityRules),
  initialMemberIDs: t.maybe(t.list(t.String)),
});
async function threadCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<NewThreadResult> {
  const request: NewThreadRequest = input;
  validateInput(newThreadRequestInputValidator, request);
  console.log(input);
  return await createThread(viewer, request);
}

const joinThreadRequestInputValidator = tShape({
  threadID: t.String,
  password: t.maybe(t.String),
});
async function threadJoinResponder(
  viewer: Viewer,
  input: any,
): Promise<ThreadJoinResult> {
  const request: ThreadJoinRequest = input;
  validateInput(joinThreadRequestInputValidator, request);
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
