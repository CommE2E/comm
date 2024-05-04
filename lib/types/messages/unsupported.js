// @flow

import t, { type TInterface } from 'tcomb';

import { rawChangeRoleMessageInfoValidator } from './change-role.js';
import { rawEditMessageInfoValidator } from './edit.js';
import { rawMediaMessageInfoValidator } from './media.js';
import { rawUpdateRelationshipMessageInfoValidator } from './update-relationship.js';
import { tID, tNumber, tShape } from '../../utils/validation-utils.js';
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
  unsupportedMessageInfo: Object,
};

export const rawUnsupportedMessageInfoValidator: TInterface<RawUnsupportedMessageInfo> =
  tShape<RawUnsupportedMessageInfo>({
    type: tNumber(messageTypes.UNSUPPORTED),
    id: tID,
    threadID: tID,
    creatorID: t.String,
    time: t.Number,
    robotext: t.String,
    dontPrefixCreator: t.maybe(t.Boolean),
    unsupportedMessageInfo: t.union([
      // We include these four validators here to make sure that the keyserver
      // does ID conversion on unsupportedMessageInfo when it's one of these
      // types. These are the types whose message speces have shimming logic
      // that targets codeVersions that have been released after ID conversion
      // was introduced.
      rawUpdateRelationshipMessageInfoValidator,
      rawChangeRoleMessageInfoValidator,
      rawEditMessageInfoValidator,
      rawMediaMessageInfoValidator,
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
  unsupportedMessageInfo: Object,
};
