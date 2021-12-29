// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { tID, tShape, tNumber } from '../../utils/validation-utils';
import { mediaValidator } from '../media-types';
import type { Media } from '../media-types';
import type { RelativeUserInfo } from '../user-types';

export type MediaMessageData = {
  type: 15,
  localID?: string, // for optimistic creations. included by new clients
  threadID: string,
  creatorID: string,
  time: number,
  media: $ReadOnlyArray<Media>,
};

export type RawMediaMessageInfo = {
  ...MediaMessageData,
  id?: string, // null if local copy without ID yet
};

export const rawMediaMessageInfoValidator: TInterface = tShape({
  type: tNumber(15),
  localID: t.maybe(t.String),
  threadID: tID,
  creatorID: t.String,
  time: t.Number,
  media: t.list(mediaValidator),
  id: t.maybe(t.String),
});

export type MediaMessageInfo = {
  type: 15,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creator: RelativeUserInfo,
  time: number, // millisecond timestamp
  media: $ReadOnlyArray<Media>,
};
