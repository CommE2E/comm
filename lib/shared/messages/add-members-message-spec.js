// @flow

import { messageTypes } from '../../types/message-types';
import type {
  AddMembersMessageData,
  RawAddMembersMessageInfo,
} from '../../types/message/add-members';
import type { MessageSpec } from './message-spec';

export const addMembersMessageSpec: MessageSpec<
  AddMembersMessageData,
  RawAddMembersMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify(data.addedUserIDs);
  },

  rawMessageInfoFromRow(row) {
    return {
      type: messageTypes.ADD_MEMBERS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      addedUserIDs: JSON.parse(row.content),
    };
  },
});
