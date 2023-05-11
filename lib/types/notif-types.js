// @flow

import t, { type TInterface } from 'tcomb';

import type { EntityText, ThreadEntity } from '../utils/entity-text.js';
import { tShape } from '../utils/validation-utils.js';

export type NotifTexts = {
  +merged: string | EntityText,
  +body: string | EntityText,
  +title: string | ThreadEntity,
  +prefix?: string | EntityText,
};

export type ResolvedNotifTexts = {
  +merged: string,
  +body: string,
  +title: string,
  +prefix?: string,
};
export const resolvedNotifTextsValidator: TInterface<ResolvedNotifTexts> =
  tShape<ResolvedNotifTexts>({
    merged: t.String,
    body: t.String,
    title: t.String,
    prefix: t.maybe(t.String),
  });

export type WebNotification = {
  +body: string,
  +prefix?: string,
  +title: string,
  +unreadCount: number,
  +id: string,
  +threadID: string,
};

export type WNSNotification = {
  +body: string,
  +prefix?: string,
  +title: string,
  +unreadCount: number,
  +threadID: string,
};
