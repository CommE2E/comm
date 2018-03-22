// @flow

export type ActivityUpdate =
  | {| focus: true, threadID: string |}
  | {| focus: false, threadID: string, latestMessage: ?string |};

export type UpdateActivityRequest = {|
  updates: $ReadOnlyArray<ActivityUpdate>,
|};

export type UpdateActivityResult = {|
  unfocusedToUnread: string[],
|};
