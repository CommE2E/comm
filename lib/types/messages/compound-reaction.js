// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape, tUserID } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type CompoundReactionInfo = {
  +count: number,
  +viewerReacted: boolean,
};

export type CompoundReactionMessageData = {
  +type: 24,
  +localID?: string, // for optimistic creations. included by new clients
  +threadID: string,
  +creatorID: string, // doesn't make too much sense, but our types require it
  +time: number,
  +targetMessageID: string,
  +reactions: { +[reaction: string]: CompoundReactionInfo },
};

export type RawCompoundReactionMessageInfo = $ReadOnly<{
  ...CompoundReactionMessageData,
  +id?: string, // null if local copy without ID yet
}>;

export const rawCompoundReactionMessageInfoValidator: TInterface<RawCompoundReactionMessageInfo> =
  tShape<RawCompoundReactionMessageInfo>({
    type: tNumber(messageTypes.COMPOUND_REACTION),
    localID: t.maybe(t.String),
    threadID: tID,
    time: t.Number,
    targetMessageID: tID,
    reactions: t.dict(
      t.String,
      tShape<CompoundReactionInfo>({
        count: t.Number,
        viewerReacted: t.Boolean,
      }),
    ),
    id: t.maybe(tID),
    creatorID: tUserID,
  });

export type CompoundReactionMessageInfo = {
  +type: 24,
  +id?: string, // null if local copy without ID yet
  +localID?: string, // for optimistic creations
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number,
  +targetMessageID: string,
  +reactions: { +[reaction: string]: CompoundReactionInfo },
};
