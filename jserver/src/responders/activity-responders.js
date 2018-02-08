// @flow

import type { $Response, $Request } from 'express';
import type { ActivityUpdate } from 'lib/types/activity-types';

import t from 'tcomb';

import { activityUpdater } from '../updaters/activity-updater';
import { setCurrentViewerFromCookie } from '../session/cookies';
import { tBool } from '../utils/tcomb-utils';

async function updateActivityResponder(req: $Request, res: $Response) {
  const updates: $ReadOnlyArray<ActivityUpdate> = (req.body: any);
  const inputValidator = t.list(t.union([
    t.interface(
      { focus: tBool(true), threadID: t.String },
      { strict: true },
    ),
    t.interface(
      {
        focus: tBool(false),
        threadID: t.String,
        latestMessage: t.maybe(t.String),
      },
      { strict: true },
    ),
    t.interface(
      { closing: tBool(true) },
      { strict: true },
    ),
  ]));
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
