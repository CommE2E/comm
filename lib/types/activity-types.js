// @flow

export type ActivityUpdate =
  | {| focus: true, threadID: string |}
  | {| focus: false, threadID: string, latestMessage: ?string |}
  | {| closing: true |};

export type UpdateActivityResult = {|
  unfocusedToUnread: string[],
|};
