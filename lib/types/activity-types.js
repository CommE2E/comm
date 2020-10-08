// @flow

import PropTypes from 'prop-types';

export type ActivityUpdate =
  | {| focus: true, threadID: string |}
  | {| focus: false, threadID: string, latestMessage: ?string |};
export const activityUpdatePropType = PropTypes.oneOfType([
  PropTypes.shape({
    focus: PropTypes.oneOf([true]).isRequired,
    threadID: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    focus: PropTypes.oneOf([false]).isRequired,
    threadID: PropTypes.string.isRequired,
    latestMessage: PropTypes.string,
  }),
]);

export type UpdateActivityRequest = {|
  updates: $ReadOnlyArray<ActivityUpdate>,
|};

export type UpdateActivityResult = {|
  unfocusedToUnread: string[],
|};

export type ActivityUpdateSuccessPayload = {|
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
  result: UpdateActivityResult,
|};

export const queueActivityUpdatesActionType = 'QUEUE_ACTIVITY_UPDATES';
export type QueueActivityUpdatesPayload = {|
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
|};

export type SetThreadUnreadStatusRequest =
  | {| +unread: true, +threadID: string |}
  | {| +unread: false, +threadID: string, +latestMessage: string |};
export type SetThreadUnreadStatusResult = {|
  +resetToUnread: boolean,
|};
export type SetThreadUnreadStatusPayload = {|
  ...SetThreadUnreadStatusResult,
  +threadID: string,
|};
