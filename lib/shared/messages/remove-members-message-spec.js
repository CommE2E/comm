// @flow

import { messageTypes } from '../../types/message-types';
import type {
  RawRemoveMembersMessageInfo,
  RemoveMembersMessageData,
} from '../../types/message/remove-members';
import type { MessageSpec } from './message-spec';

export const removeMembersMessageSpec: MessageSpec<
  RemoveMembersMessageData,
  RawRemoveMembersMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify(data.removedUserIDs);
  },

  rawMessageInfoFromRow(row) {
    return {
      type: messageTypes.REMOVE_MEMBERS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      removedUserIDs: JSON.parse(row.content),
    };
  },
});
