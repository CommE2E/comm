// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  RawRemoveMembersMessageInfo,
  RemoveMembersMessageData,
  RemoveMembersMessageInfo,
} from '../../types/messages/remove-members';
import { values } from '../../utils/objects';
import type { MessageSpec } from './message-spec';
import { joinResult } from './utils';

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

  robotext(messageInfo, creator, params) {
    const users = messageInfo.removedMembers;
    invariant(users.length !== 0, 'removed who??');
    const removedUsersString = params.robotextForUsers(users);
    return `${creator} removed ${removedUsersString}`;
  },

  notificationTexts(messageInfos, threadInfo, params) {
    const removedMembersObject = {};
    for (const messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.REMOVE_MEMBERS,
        'messageInfo should be messageTypes.REMOVE_MEMBERS!',
      );
      for (const member of messageInfo.removedMembers) {
        removedMembersObject[member.id] = member;
      }
    }
    const removedMembers = values(removedMembersObject);

    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageTypes.REMOVE_MEMBERS,
      'messageInfo should be messageTypes.REMOVE_MEMBERS!',
    );
    const mergedMessageInfo = { ...mostRecentMessageInfo, removedMembers };

    const robotext = params.strippedRobotextForMessageInfo(
      mergedMessageInfo,
      threadInfo,
    );
    const merged = `${robotext} from ${params.notifThreadName(threadInfo)}`;
    return {
      merged,
      title: threadInfo.uiName,
      body: robotext,
    };
  },

  notificationCollapseKey(rawMessageInfo) {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
    );
  },

  generatesNotifs: false,

  userIDs(rawMessageInfo) {
    return rawMessageInfo.removedUserIDs;
  },
});
