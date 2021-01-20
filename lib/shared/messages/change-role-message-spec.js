// @flow

import { messageTypes } from '../../types/message-types';
import type {
  ChangeRoleMessageData,
  ChangeRoleMessageInfo,
  RawChangeRoleMessageInfo,
} from '../../types/message/change-role';
import type { MessageSpec } from './message-spec';

export const changeRoleMessageSpec: MessageSpec<
  ChangeRoleMessageData,
  RawChangeRoleMessageInfo,
  ChangeRoleMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify({
      userIDs: data.userIDs,
      newRole: data.newRole,
    });
  },

  rawMessageInfoFromRow(row) {
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.CHANGE_ROLE,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      userIDs: content.userIDs,
      newRole: content.newRole,
    };
  },

  createMessageInfo(rawMessageInfo, creator, params) {
    const members = params.createRelativeUserInfos(rawMessageInfo.userIDs);
    return {
      type: messageTypes.CHANGE_ROLE,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      members,
      newRole: rawMessageInfo.newRole,
    };
  },

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },
});
