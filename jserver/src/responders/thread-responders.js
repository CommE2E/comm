// @flow

import type { $Response, $Request } from 'express';
import type { ThreadDeletionRequest } from 'lib/types/thread-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { tShape } from '../utils/tcomb-utils';
import { currentViewer } from '../session/viewer';
import { deleteThread } from '../deleters/thread-deleters';

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

export {
  threadDeletionResponder,
};
