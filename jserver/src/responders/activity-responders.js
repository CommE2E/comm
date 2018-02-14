// @flow

import type { $Response, $Request } from 'express';
import type { ActivityUpdate } from 'lib/types/activity-types';

import t from 'tcomb';

import { activityUpdater } from '../updaters/activity-updater';
import { setCurrentViewerFromCookie } from '../session/cookies';
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
    return { error: 'invalid_parameters' };
  }

  await setCurrentViewerFromCookie(req.cookies);
  const result = await activityUpdater(updates);

  if (result) {
    return { success: true, unfocusedToUnread: result.unfocusedToUnread };
  } else {
    return { error: 'invalid_credentials' };
  }
}

export {
  updateActivityResponder,
};
