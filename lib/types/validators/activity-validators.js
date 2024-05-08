// @flow

import t, { type TInterface, type TList } from 'tcomb';

import { tShape, tID } from '../../utils/validation-utils.js';
import type {
  UpdateActivityRequest,
  SetThreadUnreadStatusRequest,
  ActivityUpdate,
} from '../activity-types.js';

export const setThreadUnreadStatusValidator: TInterface<SetThreadUnreadStatusRequest> =
  tShape<SetThreadUnreadStatusRequest>({
    threadID: tID,
    unread: t.Bool,
    latestMessage: t.maybe(tID),
  });

export const activityUpdatesInputValidator: TList<Array<ActivityUpdate>> =
  t.list(
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
