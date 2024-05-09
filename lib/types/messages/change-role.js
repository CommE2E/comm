// @flow

import t, { type TInterface } from 'tcomb';

import { tID, tNumber, tShape, tUserID } from '../../utils/validation-utils.js';
import { messageTypes } from '../message-types-enum.js';
import type { RelativeUserInfo } from '../user-types.js';

export type ChangeRoleMessageData = {
  +type: 6,
  +threadID: string,
  +creatorID: string,
  +time: number,
  +userIDs: string[],
  +newRole: string,
  +roleName?: string, // Older clients will not have this field
};

export type RawChangeRoleMessageInfo = $ReadOnly<{
  ...ChangeRoleMessageData,
  +id: string,
}>;

export const rawChangeRoleMessageInfoValidator: TInterface<RawChangeRoleMessageInfo> =
  tShape<RawChangeRoleMessageInfo>({
    type: tNumber(messageTypes.CHANGE_ROLE),
    threadID: tID,
    creatorID: tUserID,
    time: t.Number,
    userIDs: t.list(tUserID),
    newRole: tID,
    id: tID,
    roleName: t.maybe(t.String),
  });

export type ChangeRoleMessageInfo = {
  +type: 6,
  +id: string,
  +threadID: string,
  +creator: RelativeUserInfo,
  +time: number,
  +members: RelativeUserInfo[],
  +newRole: string,
  +roleName?: string, // Older clients will not have this field
};
