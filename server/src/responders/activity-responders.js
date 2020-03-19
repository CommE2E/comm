// @flow

import type { Viewer } from '../session/viewer';
import type {
  UpdateActivityResult,
  UpdateActivityRequest,
} from 'lib/types/activity-types';

import t from 'tcomb';

import { activityUpdater } from '../updaters/activity-updaters';
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
    tShape({
      closing: tBool(true),
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

export { activityUpdatesInputValidator, updateActivityResponder };
