// @flow

import type { RelativeUserInfo } from '../user-types';

export type ReactionMessageData = {
  +type: 19,
  +threadID: string,
  +creatorID: string,
  +time: number,
  +targetMessageID: string,
  +reaction: string,
  +action: 'add_reaction' | 'remove_reaction',
};

export type RawReactionMessageInfo = {
  ...ReactionMessageData,
  id: string,
};

export type ReactionMessageInfo = {
  +type: 19,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number,
  +targetMessageID: string,
  +reaction: string,
  +action: 'add_reaction' | 'remove_reaction',
};
