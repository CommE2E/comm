// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  AddMembersMessageData,
  AddMembersMessageInfo,
  RawAddMembersMessageInfo,
} from '../../types/messages/add-members';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import {
  ET,
  type EntityText,
  pluralizeEntityText,
} from '../../utils/entity-text';
import { values } from '../../utils/objects';
import type {
  CreateMessageInfoParams,
  MessageSpec,
  NotificationTextsParams,
} from './message-spec';
import { joinResult } from './utils';

export const addMembersMessageSpec: MessageSpec<
  AddMembersMessageData,
  RawAddMembersMessageInfo,
  AddMembersMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: AddMembersMessageData | RawAddMembersMessageInfo,
  ): string {
    return JSON.stringify(data.addedUserIDs);
  },

  messageContentForClientDB(data: RawAddMembersMessageInfo): string {
    return this.messageContentForServerDB(data);
  },

  rawMessageInfoFromServerDBRow(row: Object): RawAddMembersMessageInfo {
    return {
      type: messageTypes.ADD_MEMBERS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      addedUserIDs: JSON.parse(row.content),
    };
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawAddMembersMessageInfo {
    const content = clientDBMessageInfo.content;
    invariant(
      content !== undefined && content !== null,
      'content must be defined',
    );
    const rawAddMembersMessageInfo: RawAddMembersMessageInfo = {
      type: messageTypes.ADD_MEMBERS,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      addedUserIDs: JSON.parse(content),
    };
    return rawAddMembersMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawAddMembersMessageInfo,
    creator: RelativeUserInfo,
    params: CreateMessageInfoParams,
  ): AddMembersMessageInfo {
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

  rawMessageInfoFromMessageData(
    messageData: AddMembersMessageData,
    id: ?string,
  ): RawAddMembersMessageInfo {
    invariant(id, 'RawAddMembersMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(messageInfo: AddMembersMessageInfo): EntityText {
    const users = messageInfo.addedMembers;
    invariant(users.length !== 0, 'added who??');

    const creator = ET.user({ userInfo: messageInfo.creator });
    const addedUsers = pluralizeEntityText(
      users.map(user => ET`${ET.user({ userInfo: user })}`),
    );

    return ET`${creator} added ${addedUsers}`;
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
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

  notificationCollapseKey(rawMessageInfo: RawAddMembersMessageInfo): string {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
    );
  },

  generatesNotifs: async () => undefined,

  userIDs(rawMessageInfo: RawAddMembersMessageInfo): $ReadOnlyArray<string> {
    return rawMessageInfo.addedUserIDs;
  },
});
