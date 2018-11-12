// @flow

import PropTypes from 'prop-types';

export type ActivityUpdate =
  | {| focus: true, threadID: string |}
  | {| focus: false, threadID: string, latestMessage: ?string |}
  | {| focus?: void, closing: true |};
export const activityUpdatePropType = PropTypes.oneOfType([
  PropTypes.shape({
    focus: PropTypes.oneOf([ true ]).isRequired,
    threadID: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    focus: PropTypes.oneOf([ false ]).isRequired,
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
export type ActivityUpdateErrorExtras = {
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
};

export const queueActivityUpdatesActionType = "QUEUE_ACTIVITY_UPDATES";
export type QueueActivityUpdatesPayload = {|
  activityUpdates: $ReadOnlyArray<ActivityUpdate>,
|};
