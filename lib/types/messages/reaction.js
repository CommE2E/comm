// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type ReactionMessageData = {
  +type: 19,
  +localID?: string, // for optimistic creations. included by new clients
  +threadID: string,
  +creatorID: string,
  +time: number,
  +targetMessageID: string,
  +reaction: string,
  +action: 'add_reaction' | 'remove_reaction',
};

export type RawReactionMessageInfo = {
  ...ReactionMessageData,
  id?: string, // null if local copy without ID yet
};

export const rawReactionMessageInfoValidator: TInterface<RawReactionMessageInfo> =
  tShape<RawReactionMessageInfo>({
    type: tNumber(messageTypes.REACTION),
    localID: t.maybe(t.String),
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    targetMessageID: tID,
    reaction: t.String,
    action: t.enums.of(['add_reaction', 'remove_reaction']),
    id: t.maybe(tID),
  });

export type ReactionMessageInfo = {
  +type: 19,
  +id?: string, // null if local copy without ID yet
  +localID?: string, // for optimistic creations
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number,
  +targetMessageID: string,
  +reaction: string,
  +action: 'add_reaction' | 'remove_reaction',
};
