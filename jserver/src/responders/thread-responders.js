// @flow

import type { $Response, $Request } from 'express';
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
  assertVisibilityRules,
} from 'lib/types/thread-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { tShape, tNumEnum, tColor } from '../utils/tcomb-utils';
import { currentViewer } from '../session/viewer';
import { deleteThread } from '../deleters/thread-deleters';
import {
  updateRole,
  removeMembers,
  leaveThread,
  updateThread,
} from '../updaters/thread-updaters';
import createThread from '../creators/thread-creator';

const threadDeletionRequestInputValidator = tShape({
  threadID: t.String,
  accountPassword: t.String,
});

async function threadDeletionResponder(req: $Request, res: $Response) {
  const threadDeletionRequest: ThreadDeletionRequest = (req.body: any);
  if (!threadDeletionRequestInputValidator.is(threadDeletionRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const viewer = currentViewer();
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  await deleteThread(viewer, threadDeletionRequest);
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
  req: $Request,
  res: $Response,
): Promise<ChangeThreadSettingsResult> {
  const roleChangeRequest: RoleChangeRequest = (req.body: any);
  if (!roleChangeRequestInputValidator.is(roleChangeRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const { threadInfo, newMessageInfos } = await updateRole(roleChangeRequest);
  return { threadInfo, newMessageInfos };
}

const removeMembersRequestInputValidator = tShape({
  threadID: t.String,
  memberIDs: t.list(t.String),
});

async function memberRemovalResponder(
  req: $Request,
  res: $Response,
): Promise<ChangeThreadSettingsResult> {
  const removeMembersRequest: RemoveMembersRequest = (req.body: any);
  if (!removeMembersRequestInputValidator.is(removeMembersRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const { threadInfo, newMessageInfos } = await removeMembers(
    removeMembersRequest,
  );
  return { threadInfo, newMessageInfos };
}

const leaveThreadRequestInputValidator = tShape({
  threadID: t.String,
});

async function threadLeaveResponder(
  req: $Request,
  res: $Response,
): Promise<LeaveThreadResult> {
  const leaveThreadRequest: LeaveThreadRequest = (req.body: any);
  if (!leaveThreadRequestInputValidator.is(leaveThreadRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const { threadInfos } = await leaveThread(leaveThreadRequest);
  return { threadInfos };
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
  req: $Request,
  res: $Response,
): Promise<ChangeThreadSettingsResult> {
  const updateThreadRequest: UpdateThreadRequest = (req.body: any);
  if (!updateThreadRequestInputValidator.is(updateThreadRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const viewer = currentViewer();
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const result = await updateThread(viewer, updateThreadRequest);
  const { threadInfo, newMessageInfos } = result;
  return { threadInfo, newMessageInfos };
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
  req: $Request,
  res: $Response,
): Promise<NewThreadResult> {
  const newThreadRequest: NewThreadRequest = (req.body: any);
  if (!newThreadRequestInputValidator.is(newThreadRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const viewer = currentViewer();
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const result = await createThread(viewer, newThreadRequest);
  const { newThreadInfo, newMessageInfos } = result;
  return { newThreadInfo, newMessageInfos };
}

export {
  threadDeletionResponder,
  roleUpdateResponder,
  memberRemovalResponder,
  threadLeaveResponder,
  threadUpdateResponder,
  threadCreationResponder,
};
