// @flow

import type { Viewer } from '../session/viewer';
import type {
  UpdateActivityResult,
  UpdateActivityRequest,
} from 'lib/types/activity-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { activityUpdater } from '../updaters/activity-updaters';
import { tBool, tShape } from '../utils/tcomb-utils';

const inputValidator = tShape({
  updates: t.list(t.union([
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
  ])),
});

async function updateActivityResponder(
  viewer: Viewer,
  input: any,
): Promise<UpdateActivityResult> {
  const updateActivityRequest: UpdateActivityRequest = input;
  if (!inputValidator.is(updateActivityRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await activityUpdater(viewer, updateActivityRequest);
}

export {
  updateActivityResponder,
};
