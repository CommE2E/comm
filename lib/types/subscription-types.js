// @flow

import _mapValues from 'lodash/fp/mapValues.js';
import t, { type TInterface } from 'tcomb';

import type { Shape } from './core.js';
import { tShape } from '../utils/validation-utils.js';

export const threadSubscriptions = Object.freeze({
  home: 'home',
  pushNotifs: 'pushNotifs',
});

export type ThreadSubscription = $ObjMap<
  typeof threadSubscriptions,
  () => boolean,
>;

export const threadSubscriptionValidator: TInterface<ThreadSubscription> =
  tShape<ThreadSubscription>(_mapValues(() => t.Boolean)(threadSubscriptions));

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
