// @flow

import { messageTypes } from '../../types/message-types';
import type {
  AddMembersMessageData,
  AddMembersMessageInfo,
  RawAddMembersMessageInfo,
} from '../../types/message/add-members';
import type { MessageSpec } from './message-spec';

export const addMembersMessageSpec: MessageSpec<
  AddMembersMessageData,
  RawAddMembersMessageInfo,
  AddMembersMessageInfo,
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

  createMessageInfo(rawMessageInfo, creator, params) {
    const addedMembers = params.createRelativeUserInfos(
      rawMessageInfo.addedUserIDs,
    );
    return {
      type: messageTypes.ADD_MEMBERS,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      addedMembers,
    };
  },

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },
});
