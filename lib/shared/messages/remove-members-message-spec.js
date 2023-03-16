// @flow

import invariant from 'invariant';

import type { CreateMessageInfoParams, MessageSpec } from './message-spec.js';
import { joinResult } from './utils.js';
import { messageTypes } from '../../types/message-types.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  RawRemoveMembersMessageInfo,
  RemoveMembersMessageData,
  RemoveMembersMessageInfo,
} from '../../types/messages/remove-members.js';
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

export const removeMembersMessageSpec: MessageSpec<
  RemoveMembersMessageData,
  RawRemoveMembersMessageInfo,
  RemoveMembersMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: RemoveMembersMessageData | RawRemoveMembersMessageInfo,
  ): string {
    return JSON.stringify(data.removedUserIDs);
  },

  messageContentForClientDB(data: RawRemoveMembersMessageInfo): string {
    return this.messageContentForServerDB(data);
  },

  rawMessageInfoFromServerDBRow(row: Object): RawRemoveMembersMessageInfo {
    return {
      type: messageTypes.REMOVE_MEMBERS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      removedUserIDs: JSON.parse(row.content),
    };
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawRemoveMembersMessageInfo {
    const content = clientDBMessageInfo.content;
    invariant(
      content !== undefined && content !== null,
      'content must be defined for RemoveMembers',
    );
    const rawRemoveMembersMessageInfo: RawRemoveMembersMessageInfo = {
      type: messageTypes.REMOVE_MEMBERS,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      removedUserIDs: JSON.parse(content),
    };
    return rawRemoveMembersMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawRemoveMembersMessageInfo,
    creator: RelativeUserInfo,
    params: CreateMessageInfoParams,
  ): RemoveMembersMessageInfo {
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

  rawMessageInfoFromMessageData(
    messageData: RemoveMembersMessageData,
    id: ?string,
  ): RawRemoveMembersMessageInfo {
    invariant(id, 'RawRemoveMembersMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(messageInfo: RemoveMembersMessageInfo): EntityText {
    const users = messageInfo.removedMembers;
    invariant(users.length !== 0, 'added who??');

    const creator = ET.user({ userInfo: messageInfo.creator });
    const removedUsers = pluralizeEntityText(
      users.map(user => ET`${ET.user({ userInfo: user })}`),
    );

    return ET`${creator} removed ${removedUsers}`;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
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

    const robotext = notifRobotextForMessageInfo(mergedMessageInfo, threadInfo);
    const merged = ET`${robotext} from ${ET.thread({
      display: 'shortName',
      threadInfo,
    })}`;
    return {
      merged,
      title: threadInfo.uiName,
      body: robotext,
    };
  },

  notificationCollapseKey(rawMessageInfo: RawRemoveMembersMessageInfo): string {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
    );
  },

  generatesNotifs: async () => undefined,

  userIDs(rawMessageInfo: RawRemoveMembersMessageInfo): $ReadOnlyArray<string> {
    return rawMessageInfo.removedUserIDs;
  },
});
