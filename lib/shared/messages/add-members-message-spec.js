// @flow

import invariant from 'invariant';

import type {
  CreateMessageInfoParams,
  MessageSpec,
  NotificationTextsParams,
  MergeRobotextMessageItemResult,
} from './message-spec.js';
import { joinResult } from './utils.js';
import type { RobotextChatMessageInfoItem } from '../../selectors/chat-selectors.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  ClientDBMessageInfo,
  MessageInfo,
} from '../../types/message-types.js';
import {
  type AddMembersMessageData,
  type AddMembersMessageInfo,
  type RawAddMembersMessageInfo,
  rawAddMembersMessageInfoValidator,
} from '../../types/messages/add-members.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import {
  type EntityText,
  ET,
  pluralizeEntityText,
} from '../../utils/entity-text.js';
import { values } from '../../utils/objects.js';
import { notifRobotextForMessageInfo } from '../notif-utils.js';

function getAddMembersRobotext(messageInfo: AddMembersMessageInfo): EntityText {
  const users = messageInfo.addedMembers;
  invariant(users.length !== 0, 'added who??');

  const creator = ET.user({ userInfo: messageInfo.creator });
  const addedUsers = pluralizeEntityText(
    users.map(user => ET`${ET.user({ userInfo: user })}`),
  );

  return ET`${creator} added ${addedUsers}`;
}

type AddMembersMessageSpec = MessageSpec<
  AddMembersMessageData,
  RawAddMembersMessageInfo,
  AddMembersMessageInfo,
> & {
  // We need to explicitly type this as non-optional so that
  // it can be referenced from messageContentForClientDB below
  +messageContentForServerDB: (
    data: AddMembersMessageData | RawAddMembersMessageInfo,
  ) => string,
  ...
};

export const addMembersMessageSpec: AddMembersMessageSpec = Object.freeze({
  messageContentForServerDB(
    data: AddMembersMessageData | RawAddMembersMessageInfo,
  ): string {
    return JSON.stringify(data.addedUserIDs);
  },

  messageContentForClientDB(data: RawAddMembersMessageInfo): string {
    return addMembersMessageSpec.messageContentForServerDB(data);
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
    return getAddMembersRobotext(messageInfo);
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): Promise<NotifTexts> {
    const addedMembersObject: { [string]: RelativeUserInfo } = {};
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

    const { parentThreadInfo } = params;
    const robotext = notifRobotextForMessageInfo(
      mergedMessageInfo,
      threadInfo,
      parentThreadInfo,
    );
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

  userIDs(rawMessageInfo: RawAddMembersMessageInfo): $ReadOnlyArray<string> {
    return rawMessageInfo.addedUserIDs;
  },

  canBeSidebarSource: true,

  canBePinned: false,

  validator: rawAddMembersMessageInfoValidator,

  mergeIntoPrecedingRobotextMessageItem(
    messageInfo: AddMembersMessageInfo,
    precedingMessageInfoItem: RobotextChatMessageInfoItem,
  ): MergeRobotextMessageItemResult {
    if (precedingMessageInfoItem.messageInfos.length === 0) {
      return { shouldMerge: false };
    }

    const addedMembers = [];
    const creatorID = messageInfo.creator.id;
    for (const precedingMessageInfo of precedingMessageInfoItem.messageInfos) {
      if (
        precedingMessageInfo.type !== messageTypes.ADD_MEMBERS ||
        precedingMessageInfo.creator.id !== creatorID
      ) {
        return { shouldMerge: false };
      }
      for (const addedMember of precedingMessageInfo.addedMembers) {
        addedMembers.push(addedMember);
      }
    }

    const messageInfos = [
      messageInfo,
      ...precedingMessageInfoItem.messageInfos,
    ];
    const newRobotext = getAddMembersRobotext({
      ...messageInfo,
      addedMembers,
    });
    const mergedItem = {
      ...precedingMessageInfoItem,
      messageInfos,
      robotext: newRobotext,
    };
    return { shouldMerge: true, item: mergedItem };
  },
});
