// @flow

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
