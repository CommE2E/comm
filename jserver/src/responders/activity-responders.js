// @flow

import type { $Response, $Request } from 'express';
import type { ActivityUpdate } from 'lib/types/activity-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { activityUpdater } from '../updaters/activity-updater';
import { tBool, tShape } from '../utils/tcomb-utils';

const inputValidator = t.list(t.union([
  tShape({
    focus: tBool(true),
    threadID: t.String,
  }),
  tShape({
    focus: tBool(false),
    threadID: t.String,
    latestMessage: t.maybe(t.String),
  }),
  tShape({
    closing: tBool(true),
  }),
]));

async function updateActivityResponder(req: $Request, res: $Response) {
  const updates: $ReadOnlyArray<ActivityUpdate> = (req.body: any);
  if (!inputValidator.is(updates)) {
    throw new ServerError('invalid_parameters');
  }

  const result = await activityUpdater(updates);

  if (!result) {
    throw new ServerError('invalid_credentials');
  }

  return { unfocusedToUnread: result.unfocusedToUnread };
}

export {
  updateActivityResponder,
};
