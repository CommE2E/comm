// @flow

import t from 'tcomb';
import type { TList } from 'tcomb';

import {
  type UpdateActivityResult,
  type UpdateActivityRequest,
  type SetThreadUnreadStatusRequest,
  type SetThreadUnreadStatusResult,
  type ActivityUpdate,
  setThreadUnreadStatusResult,
  updateActivityResultValidator,
} from 'lib/types/activity-types.js';
import { tShape, tID } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import {
  activityUpdater,
  setThreadUnreadStatus,
} from '../updaters/activity-updaters.js';
import { validateInput, validateOutput } from '../utils/validation-utils.js';

const activityUpdatesInputValidator: TList<Array<ActivityUpdate>> = t.list(
  tShape({
    focus: t.Bool,
    threadID: tID,
    latestMessage: t.maybe(tID),
  }),
);

const inputValidator = tShape<UpdateActivityRequest>({
  updates: activityUpdatesInputValidator,
});

async function updateActivityResponder(
  viewer: Viewer,
  input: mixed,
): Promise<UpdateActivityResult> {
  const request = await validateInput(viewer, inputValidator, input);
  const result = await activityUpdater(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    updateActivityResultValidator,
    result,
  );
}

const setThreadUnreadStatusValidator = tShape<SetThreadUnreadStatusRequest>({
  threadID: tID,
  unread: t.Bool,
  latestMessage: t.maybe(tID),
});
async function threadSetUnreadStatusResponder(
  viewer: Viewer,
  input: mixed,
): Promise<SetThreadUnreadStatusResult> {
  const request = await validateInput(
    viewer,
    setThreadUnreadStatusValidator,
    input,
  );

  const result = await setThreadUnreadStatus(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    setThreadUnreadStatusResult,
    result,
  );
}

export {
  activityUpdatesInputValidator,
  updateActivityResponder,
  threadSetUnreadStatusResponder,
};
