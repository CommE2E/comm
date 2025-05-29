// @flow

import _mapValues from 'lodash/fp/mapValues.js';
import t, { type TInterface } from 'tcomb';

import { tShape } from '../utils/validation-utils.js';

const threadSubscriptions = Object.freeze({
  home: 'home',
  pushNotifs: 'pushNotifs',
});

export type ThreadSubscription = {
  [K in keyof typeof threadSubscriptions]: boolean,
};

export const threadSubscriptionValidator: TInterface<ThreadSubscription> =
  tShape<ThreadSubscription>(_mapValues(() => t.Boolean)(threadSubscriptions));

export type SubscriptionUpdateRequest = {
  threadID: string,
  updatedFields: Partial<ThreadSubscription>,
};

export type SubscriptionUpdateResponse = {
  threadSubscription: ThreadSubscription,
};

export type SubscriptionUpdateResult = {
  threadID: string,
  subscription: ThreadSubscription,
};

const defaultThreadSubscription: ThreadSubscription = {
  home: false,
  pushNotifs: false,
};

const joinThreadSubscription: ThreadSubscription = {
  home: true,
  pushNotifs: true,
};

export {
  threadSubscriptions,
  defaultThreadSubscription,
  joinThreadSubscription,
};
