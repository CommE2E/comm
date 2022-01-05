// @flow

import _mapValues from 'lodash/fp/mapValues';
import t, { type TInterface } from 'tcomb';

import { tShape } from '../utils/validation-utils';
import type { Shape } from './core';

export const threadSubscriptions = Object.freeze({
  home: 'home',
  pushNotifs: 'pushNotifs',
});

export type ThreadSubscription = $ObjMap<
  typeof threadSubscriptions,
  () => boolean,
>;

export const threadSubscriptionValidator: TInterface = tShape(
  _mapValues(() => t.Boolean)(threadSubscriptions),
);

export type SubscriptionUpdateRequest = {
  threadID: string,
  updatedFields: Shape<ThreadSubscription>,
};

export type SubscriptionUpdateResponse = {
  threadSubscription: ThreadSubscription,
};
export const SubscriptionUpdateResponseValidator: TInterface = tShape({
  threadSubscription: threadSubscriptionValidator,
});

export type SubscriptionUpdateResult = {
  threadID: string,
  subscription: ThreadSubscription,
};
