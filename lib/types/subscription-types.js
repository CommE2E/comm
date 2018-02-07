// @flow

export type ThreadSubscription = {|
  pushNotifs: bool,
  home: bool,
|};

export type SubscriptionUpdate = {|
  threadID: string,
  updatedFields: $Shape<ThreadSubscription>,
|};
