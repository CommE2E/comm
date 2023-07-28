// @flow

import t, { type TInterface, type TList } from 'tcomb';

import {
  type UpdateActivityResult,
  type UpdateActivityRequest,
  type SetThreadUnreadStatusRequest,
  type SetThreadUnreadStatusResult,
  type ActivityUpdate,
} from 'lib/types/activity-types.js';
import { tShape, tID } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import {
  activityUpdater,
  setThreadUnreadStatus,
} from '../updaters/activity-updaters.js';

const activityUpdatesInputValidator: TList<Array<ActivityUpdate>> = t.list(
  tShape({
    focus: t.Bool,
    threadID: tID,
    latestMessage: t.maybe(tID),
  }),
);

export const updateActivityResponderInputValidator: TInterface<UpdateActivityRequest> =
  tShape<UpdateActivityRequest>({
    updates: activityUpdatesInputValidator,
  });

async function updateActivityResponder(
  viewer: Viewer,
  request: UpdateActivityRequest,
): Promise<UpdateActivityResult> {
  return await activityUpdater(viewer, request);
}

export const setThreadUnreadStatusValidator: TInterface<SetThreadUnreadStatusRequest> =
  tShape<SetThreadUnreadStatusRequest>({
    threadID: tID,
    unread: t.Bool,
    latestMessage: t.maybe(tID),
  });
async function threadSetUnreadStatusResponder(
  viewer: Viewer,
  request: SetThreadUnreadStatusRequest,
): Promise<SetThreadUnreadStatusResult> {
  return await setThreadUnreadStatus(viewer, request);
}

export {
  activityUpdatesInputValidator,
  updateActivityResponder,
  threadSetUnreadStatusResponder,
};
