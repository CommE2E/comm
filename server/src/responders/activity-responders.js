// @flow

import t from 'tcomb';
import type { TList, TInterface } from 'tcomb';

import {
  type UpdateActivityResult,
  type UpdateActivityRequest,
  type SetThreadUnreadStatusRequest,
  type SetThreadUnreadStatusResult,
  updateActivityResultValidator,
  setThreadUnreadStatusResultValidator,
} from 'lib/types/activity-types';
import { tShape } from 'lib/utils/validation-utils';

import type { Viewer } from '../session/viewer';
import {
  activityUpdater,
  setThreadUnreadStatus,
} from '../updaters/activity-updaters';
import {
  validateInput,
  validateAndConvertOutput,
} from '../utils/validation-utils';

const activityUpdatesInputValidator: TList<TInterface> = t.list(
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
  const response = await activityUpdater(viewer, request);
  return validateAndConvertOutput(
    viewer,
    updateActivityResultValidator,
    response,
  );
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
  const response = await setThreadUnreadStatus(viewer, request);
  return validateAndConvertOutput(
    viewer,
    setThreadUnreadStatusResultValidator,
    response,
  );
}

export {
  activityUpdatesInputValidator,
  updateActivityResponder,
  threadSetUnreadStatusResponder,
};
