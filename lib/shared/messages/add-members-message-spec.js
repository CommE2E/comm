// @flow

import invariant from 'invariant';

import type { CreateMessageInfoParams, MessageSpec } from './message-spec.js';
import { joinResult } from './utils.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  AddMembersMessageData,
  AddMembersMessageInfo,
  RawAddMembersMessageInfo,
} from '../../types/messages/add-members.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import {
  ET,
  type EntityText,
  pluralizeEntityText,
} from '../../utils/entity-text.js';
import { values } from '../../utils/objects.js';
import { notifRobotextForMessageInfo } from '../notif-utils.js';

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
      'content must be defined for AddMembers',
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

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
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

    const robotext = notifRobotextForMessageInfo(mergedMessageInfo, threadInfo);
    const merged = ET`${robotext} to ${ET.thread({
      display: 'shortName',
      threadInfo,
    })}`;
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
