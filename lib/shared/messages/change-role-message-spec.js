// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  ChangeRoleMessageData,
  ChangeRoleMessageInfo,
  RawChangeRoleMessageInfo,
} from '../../types/messages/change-role';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import {
  ET,
  type EntityText,
  pluralizeEntityText,
} from '../../utils/entity-text';
import { values } from '../../utils/objects';
import {
  robotextToRawString,
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import {
  pushTypes,
  type CreateMessageInfoParams,
  type MessageSpec,
  type MessageTitleParam,
  type NotificationTextsParams,
  type RobotextParams,
} from './message-spec';
import { joinResult } from './utils';

export const changeRoleMessageSpec: MessageSpec<
  ChangeRoleMessageData,
  RawChangeRoleMessageInfo,
  ChangeRoleMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: ChangeRoleMessageData | RawChangeRoleMessageInfo,
  ): string {
    return JSON.stringify({
      userIDs: data.userIDs,
      newRole: data.newRole,
    });
  },

  messageContentForClientDB(data: RawChangeRoleMessageInfo): string {
    return this.messageContentForServerDB(data);
  },

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<ChangeRoleMessageInfo>) {
    let validMessageInfo: ChangeRoleMessageInfo = (messageInfo: ChangeRoleMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
      validMessageInfo = {
        ...validMessageInfo,
        members: validMessageInfo.members.map(item => ({
          ...item,
          isViewer: false,
        })),
      };
    }
    return robotextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
  },

  rawMessageInfoFromServerDBRow(row: Object): RawChangeRoleMessageInfo {
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

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawChangeRoleMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined',
    );
    const content = JSON.parse(clientDBMessageInfo.content);
    const rawChangeRoleMessageInfo: RawChangeRoleMessageInfo = {
      type: messageTypes.CHANGE_ROLE,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      userIDs: content.userIDs,
      newRole: content.newRole,
    };
    return rawChangeRoleMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawChangeRoleMessageInfo,
    creator: RelativeUserInfo,
    params: CreateMessageInfoParams,
  ): ChangeRoleMessageInfo {
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

  rawMessageInfoFromMessageData(
    messageData: ChangeRoleMessageData,
    id: ?string,
  ): RawChangeRoleMessageInfo {
    invariant(id, 'RawChangeRoleMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(
    messageInfo: ChangeRoleMessageInfo,
    creatorString: string,
    params: RobotextParams,
  ): EntityText {
    const users = messageInfo.members;
    invariant(users.length !== 0, 'changed whose role??');

    const creator = ET.user({ userInfo: messageInfo.creator });
    const affectedUsers = pluralizeEntityText(
      users.map(user => ET`${ET.user({ userInfo: user })}`),
    );

    const { threadInfo } = params;
    invariant(threadInfo, 'ThreadInfo should be set for CHANGE_ROLE message');
    const verb = threadInfo.roles[messageInfo.newRole].isDefault
      ? 'removed'
      : 'added';
    const noun = users.length === 1 ? 'an admin' : 'admins';

    return ET`${creator} ${verb} ${affectedUsers} as ${noun}`;
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
    const membersObject = {};
    for (const messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.CHANGE_ROLE,
        'messageInfo should be messageTypes.CHANGE_ROLE!',
      );
      for (const member of messageInfo.members) {
        membersObject[member.id] = member;
      }
    }
    const members = values(membersObject);

    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageTypes.CHANGE_ROLE,
      'messageInfo should be messageTypes.CHANGE_ROLE!',
    );
    const mergedMessageInfo = { ...mostRecentMessageInfo, members };

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

  notificationCollapseKey(rawMessageInfo: RawChangeRoleMessageInfo): string {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
      rawMessageInfo.newRole,
    );
  },

  generatesNotifs: async () => pushTypes.NOTIF,
});
