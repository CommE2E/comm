// @flow

import t, { type TInterface } from 'tcomb';

import {
  rawChangeRoleMessageInfoValidator,
  type RawChangeRoleMessageInfo,
} from './change-role.js';
import type { RawDeleteMessageInfo } from './delete.js';
import { rawDeleteMessageInfoValidator } from './delete.js';
import {
  rawEditMessageInfoValidator,
  type RawEditMessageInfo,
} from './edit.js';
import {
  rawMediaMessageInfoValidator,
  type RawMediaMessageInfo,
} from './media.js';
import {
  rawReactionMessageInfoValidator,
  type RawReactionMessageInfo,
} from './reaction.js';
import {
  rawTogglePinMessageInfoValidator,
  type RawTogglePinMessageInfo,
} from './toggle-pin.js';
import {
  rawUpdateFarcasterRelationshipMessageInfoValidator,
  type RawUpdateFarcasterRelationshipMessageInfo,
} from './update-relationship.js';
import { tID, tNumber, tShape, tUserID } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type RawUnsupportedMessageInfo = {
  type: 13,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  robotext: string,
  dontPrefixCreator?: boolean,
  unsupportedMessageInfo:
    | RawUpdateFarcasterRelationshipMessageInfo
    | RawChangeRoleMessageInfo
    | RawEditMessageInfo
    | RawMediaMessageInfo
    | RawReactionMessageInfo
    | RawTogglePinMessageInfo
    | RawDeleteMessageInfo,
};

export const rawUnsupportedMessageInfoValidator: TInterface<RawUnsupportedMessageInfo> =
  tShape<RawUnsupportedMessageInfo>({
    type: tNumber(messageTypes.UNSUPPORTED),
    id: tID,
    threadID: tID,
    creatorID: tUserID,
    time: t.Number,
    robotext: t.String,
    dontPrefixCreator: t.maybe(t.Boolean),
    unsupportedMessageInfo: t.union([
      // We include these validators here to make sure that the keyserver does
      // ID conversion on unsupportedMessageInfo when it's one of these types
      rawUpdateFarcasterRelationshipMessageInfoValidator,
      rawChangeRoleMessageInfoValidator,
      rawEditMessageInfoValidator,
      rawMediaMessageInfoValidator,
      rawReactionMessageInfoValidator,
      rawTogglePinMessageInfoValidator,
      rawDeleteMessageInfoValidator,
      t.Object,
    ]),
  });

export type UnsupportedMessageInfo = {
  type: 13,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  robotext: string,
  dontPrefixCreator?: boolean,
  unsupportedMessageInfo:
    | RawUpdateFarcasterRelationshipMessageInfo
    | RawChangeRoleMessageInfo
    | RawEditMessageInfo
    | RawMediaMessageInfo
    | RawReactionMessageInfo
    | RawTogglePinMessageInfo
    | RawDeleteMessageInfo,
};
