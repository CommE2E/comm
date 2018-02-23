// @flow

import type { $Response, $Request } from 'express';
import type { Viewer } from '../session/viewer';
import type {
  ActivityUpdate,
  UpdateActivityResult,
} from 'lib/types/activity-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { activityUpdater } from '../updaters/activity-updaters';
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

async function updateActivityResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<UpdateActivityResult> {
  const updates: $ReadOnlyArray<ActivityUpdate> = (req.body: any);
  if (!inputValidator.is(updates)) {
    throw new ServerError('invalid_parameters');
  }

  return await activityUpdater(viewer, updates);
}

export {
  updateActivityResponder,
};
