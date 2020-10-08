// @flow

import type { Viewer } from '../session/viewer';
import type {
  UpdateActivityResult,
  UpdateActivityRequest,
  SetThreadUnreadStatusRequest,
  SetThreadUnreadStatusResult,
} from 'lib/types/activity-types';

import t from 'tcomb';

import {
  activityUpdater,
  setThreadUnreadStatus,
} from '../updaters/activity-updaters';
import { validateInput, tBool, tShape } from '../utils/validation-utils';

const activityUpdatesInputValidator = t.list(
  t.union([
    tShape({
      focus: tBool(true),
      threadID: t.String,
    }),
    tShape({
      focus: tBool(false),
      threadID: t.String,
      latestMessage: t.maybe(t.String),
    }),
  ]),
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

const setThreadUnreadStatusValidator = t.union([
  tShape({
    threadID: t.String,
    unread: tBool(true),
  }),
  tShape({
    threadID: t.String,
    unread: tBool(false),
    latestMessage: t.String,
  }),
]);
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
