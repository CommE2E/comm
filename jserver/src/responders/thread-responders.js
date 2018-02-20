// @flow

import type { $Response, $Request } from 'express';
import type {
  ThreadDeletionRequest,
  RoleChangeRequest,
  ChangeThreadSettingsResult,
  RemoveMembersRequest,
  LeaveThreadRequest,
  LeaveThreadResult,
} from 'lib/types/thread-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { tShape } from '../utils/tcomb-utils';
import { currentViewer } from '../session/viewer';
import { deleteThread } from '../deleters/thread-deleters';
import {
  updateRole,
  removeMembers,
  leaveThread,
} from '../updaters/thread-updaters';

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

export {
  threadDeletionResponder,
  roleUpdateResponder,
  memberRemovalResponder,
  threadLeaveResponder,
};
