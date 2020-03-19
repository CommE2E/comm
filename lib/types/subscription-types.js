// @flow

export type ThreadSubscription = {|
  pushNotifs: boolean,
  home: boolean,
|};

export type SubscriptionUpdateRequest = {|
  threadID: string,
  updatedFields: $Shape<ThreadSubscription>,
|};

export type SubscriptionUpdateResponse = {|
  threadSubscription: ThreadSubscription,
|};

export type SubscriptionUpdateResult = {|
  threadID: string,
  subscription: ThreadSubscription,
|};
