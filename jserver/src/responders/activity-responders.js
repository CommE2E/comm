// @flow

import type { $Response, $Request } from 'express';
import type { ActivityUpdate } from 'lib/types/activity-types';

import { activityUpdater } from '../updaters/activity-updater';
import { connect } from '../database';
import { setCurrentViewerFromCookie } from '../session/cookies';

async function updateActivityResponder(req: $Request, res: $Response) {
  const updates: $ReadOnlyArray<ActivityUpdate> = req.body;
  const conn = await connect();
  await setCurrentViewerFromCookie(conn, req.cookies);
  const result = await activityUpdater(conn, updates);
  conn.end();
  if (result) {
    return { success: true, unfocusedToUnread: result.unfocusedToUnread };
  } else {
    return { error: 'invalid_credentials' };
  }
}

export {
  updateActivityResponder,
};
