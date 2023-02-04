// @flow

import type { EntityText } from '../utils/entity-text';

export type NotifTexts = {
  +merged: string | EntityText,
  +body: string | EntityText,
  +title: string | EntityText,
  +prefix?: string | EntityText,
};

export type ResolvedNotifTexts = {
  +merged: string,
  +body: string,
  +title: string,
  +prefix?: string,
};
