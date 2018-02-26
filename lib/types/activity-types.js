// @flow

export type ActivityUpdate =
  | {| focus: true, threadID: string |}
  | {| focus: false, threadID: string, latestMessage: ?string |}
  | {| closing: true |};

export type UpdateActivityRequest = {|
  updates: $ReadOnlyArray<ActivityUpdate>,
|};

export type UpdateActivityResult = {|
  unfocusedToUnread: string[],
|};
