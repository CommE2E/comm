// @flow

import t from 'tcomb';
import type { TList } from 'tcomb';

import type {
  UpdateActivityResult,
  UpdateActivityRequest,
  SetThreadUnreadStatusRequest,
  SetThreadUnreadStatusResult,
  ActivityUpdate,
} from 'lib/types/activity-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import {
  activityUpdater,
  setThreadUnreadStatus,
} from '../updaters/activity-updaters.js';
import { validateInput } from '../utils/validation-utils.js';

const activityUpdatesInputValidator: TList<Array<ActivityUpdate>> = t.list(
  tShape({
    focus: t.Bool,
    threadID: t.String,
    latestMessage: t.maybe(t.String),
  }),
);

const inputValidator = tShape({
  updates: activityUpdatesInputValidator,
});

async function updateActivityResponder(
  viewer: Viewer,
  input: any,
): Promise<UpdateActivityResult> {
  const request: UpdateActivityRequest = input;
  await validateInput(viewer, inputValidator, request);
  return await activityUpdater(viewer, request);
}

const setThreadUnreadStatusValidator = tShape({
  threadID: t.String,
  unread: t.Bool,
  latestMessage: t.maybe(t.String),
});
async function threadSetUnreadStatusResponder(
  viewer: Viewer,
  input: any,
): Promise<SetThreadUnreadStatusResult> {
  const request: SetThreadUnreadStatusRequest = input;
  await validateInput(viewer, setThreadUnreadStatusValidator, request);

  return await setThreadUnreadStatus(viewer, request);
}

export {
  activityUpdatesInputValidator,
  updateActivityResponder,
  threadSetUnreadStatusResponder,
};
