// @flow

import { messageTypes } from '../../types/message-types';
import type {
  RawRemoveMembersMessageInfo,
  RemoveMembersMessageData,
  RemoveMembersMessageInfo,
} from '../../types/message/remove-members';
import type { MessageSpec } from './message-spec';

export const removeMembersMessageSpec: MessageSpec<
  RemoveMembersMessageData,
  RawRemoveMembersMessageInfo,
  RemoveMembersMessageInfo,
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

  createMessageInfo(rawMessageInfo, creator, params) {
    const removedMembers = params.createRelativeUserInfos(
      rawMessageInfo.removedUserIDs,
    );
    return {
      type: messageTypes.REMOVE_MEMBERS,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      removedMembers,
    };
  },

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },
});
