// @flow

import type { Shape } from './core.js';

export const threadSubscriptions = Object.freeze({
  home: 'home',
  pushNotifs: 'pushNotifs',
});

export type ThreadSubscription = $ObjMap<
  typeof threadSubscriptions,
  () => boolean,
>;

export type SubscriptionUpdateRequest = {
  threadID: string,
  updatedFields: Shape<ThreadSubscription>,
};

export type SubscriptionUpdateResponse = {
  threadSubscription: ThreadSubscription,
};

export type SubscriptionUpdateResult = {
  threadID: string,
  subscription: ThreadSubscription,
};
