// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  AddMembersMessageData,
  AddMembersMessageInfo,
  RawAddMembersMessageInfo,
} from '../../types/message/add-members';
import { values } from '../../utils/objects';
import type { MessageSpec } from './message-spec';
import { joinResult } from './utils';

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

  robotext(messageInfo, creator, params) {
    const users = messageInfo.addedMembers;
    invariant(users.length !== 0, 'added who??');
    const addedUsersString = params.robotextForUsers(users);
    return `${creator} added ${addedUsersString}`;
  },

  notificationTexts(messageInfos, threadInfo, params) {
    const addedMembersObject = {};
    for (const messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.ADD_MEMBERS,
        'messageInfo should be messageTypes.ADD_MEMBERS!',
      );
      for (const member of messageInfo.addedMembers) {
        addedMembersObject[member.id] = member;
      }
    }
    const addedMembers = values(addedMembersObject);

    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageTypes.ADD_MEMBERS,
      'messageInfo should be messageTypes.ADD_MEMBERS!',
    );
    const mergedMessageInfo = { ...mostRecentMessageInfo, addedMembers };

    const robotext = params.strippedRobotextForMessageInfo(
      mergedMessageInfo,
      threadInfo,
    );
    const merged = `${robotext} to ${params.notifThreadName(threadInfo)}`;
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
    return rawMessageInfo.addedUserIDs;
  },
});
