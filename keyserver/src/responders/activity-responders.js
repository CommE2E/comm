// @flow

import {
  type UpdateActivityResult,
  type UpdateActivityRequest,
  type SetThreadUnreadStatusRequest,
  type SetThreadUnreadStatusResult,
} from 'lib/types/activity-types.js';

import type { Viewer } from '../session/viewer.js';
import {
  activityUpdater,
  setThreadUnreadStatus,
} from '../updaters/activity-updaters.js';

async function updateActivityResponder(
  viewer: Viewer,
  request: UpdateActivityRequest,
): Promise<UpdateActivityResult> {
  return await activityUpdater(viewer, request);
}

async function threadSetUnreadStatusResponder(
  viewer: Viewer,
  request: SetThreadUnreadStatusRequest,
): Promise<SetThreadUnreadStatusResult> {
  return await setThreadUnreadStatus(viewer, request);
}

export { updateActivityResponder, threadSetUnreadStatusResponder };
