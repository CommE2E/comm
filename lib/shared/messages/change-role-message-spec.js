// @flow

import invariant from 'invariant';

import {
  type CreateMessageInfoParams,
  type MessageSpec,
  type NotificationTextsParams,
  messageNotifyTypes,
  type RobotextParams,
} from './message-spec.js';
import { joinResult } from './utils.js';
import type { PlatformDetails } from '../../types/device-types.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  ClientDBMessageInfo,
  MessageInfo,
} from '../../types/message-types.js';
import {
  type ChangeRoleMessageData,
  type ChangeRoleMessageInfo,
  type RawChangeRoleMessageInfo,
  rawChangeRoleMessageInfoValidator,
} from '../../types/messages/change-role.js';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import {
  type EntityText,
  entityTextToRawString,
  ET,
  pluralizeEntityText,
} from '../../utils/entity-text.js';
import { values } from '../../utils/objects.js';
import { constructChangeRoleEntityText } from '../message-utils.js';
import { notifRobotextForMessageInfo } from '../notif-utils.js';
import { hasMinCodeVersion } from '../version-utils.js';

type ChangeRoleMessageSpec = MessageSpec<
  ChangeRoleMessageData,
  RawChangeRoleMessageInfo,
  ChangeRoleMessageInfo,
> & {
  // We need to explicitly type this as non-optional so that
  // it can be referenced from messageContentForClientDB below
  +messageContentForServerDB: (
    data: ChangeRoleMessageData | RawChangeRoleMessageInfo,
  ) => string,
  ...
};

export const changeRoleMessageSpec: ChangeRoleMessageSpec = Object.freeze({
  messageContentForServerDB(
    data: ChangeRoleMessageData | RawChangeRoleMessageInfo,
  ): string {
    return JSON.stringify({
      userIDs: data.userIDs,
      newRole: data.newRole,
      roleName: data.roleName,
    });
  },

  messageContentForClientDB(data: RawChangeRoleMessageInfo): string {
    return changeRoleMessageSpec.messageContentForServerDB(data);
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
      roleName: content.roleName,
    };
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawChangeRoleMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined for ChangeRole',
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
      roleName: content.roleName,
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
      roleName: rawMessageInfo.roleName,
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
    params: RobotextParams,
  ): EntityText {
    const users = messageInfo.members;
    invariant(users.length !== 0, 'changed whose role??');

    const creator = ET.user({ userInfo: messageInfo.creator });
    const affectedUsers = pluralizeEntityText(
      users.map(user => ET`${ET.user({ userInfo: user })}`),
    );

    const { threadInfo, parentThreadInfo } = params;

    const threadRoleName =
      threadInfo?.roles[messageInfo.newRole]?.name ??
      parentThreadInfo?.roles[messageInfo.newRole]?.name;
    const messageInfoRoleName = messageInfo.roleName;

    const roleName = threadRoleName ?? messageInfoRoleName;

    const constructedEntityText = constructChangeRoleEntityText(
      affectedUsers,
      roleName,
    );

    return ET`${creator} ${constructedEntityText}`;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): Promise<NotifTexts> {
    const membersObject: { [string]: RelativeUserInfo } = {};
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

    const { parentThreadInfo } = params;
    const robotext = notifRobotextForMessageInfo(
      mergedMessageInfo,
      threadInfo,
      parentThreadInfo,
    );
    const merged = ET`${robotext} of ${ET.thread({
      display: 'shortName',
      threadInfo,
    })}`;
    return {
      merged,
      title: threadInfo.uiName,
      body: robotext,
    };
  },

  shimUnsupportedMessageInfo(
    rawMessageInfo: RawChangeRoleMessageInfo,
    platformDetails: ?PlatformDetails,
  ): RawChangeRoleMessageInfo | RawUnsupportedMessageInfo {
    if (hasMinCodeVersion(platformDetails, { native: 251 })) {
      return rawMessageInfo;
    }

    const { id, userIDs } = rawMessageInfo;
    invariant(id !== null && id !== undefined, 'id should be set on server');

    const affectedUsers = userIDs.length === 1 ? 'a member' : 'some members';
    const roleName = rawMessageInfo.roleName;

    const constructedEntityText = constructChangeRoleEntityText(
      affectedUsers,
      roleName,
    );
    const stringifiedEntityText = entityTextToRawString(constructedEntityText);

    return {
      type: messageTypes.UNSUPPORTED,
      id,
      threadID: rawMessageInfo.threadID,
      creatorID: rawMessageInfo.creatorID,
      time: rawMessageInfo.time,
      robotext: stringifiedEntityText,
      unsupportedMessageInfo: rawMessageInfo,
    };
  },

  unshimMessageInfo(
    unwrapped: RawChangeRoleMessageInfo,
  ): RawChangeRoleMessageInfo {
    return unwrapped;
  },

  notificationCollapseKey(rawMessageInfo: RawChangeRoleMessageInfo): string {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
      rawMessageInfo.newRole,
    );
  },

  getMessageNotifyType: async () => messageNotifyTypes.NOTIF_AND_SET_UNREAD,

  canBeSidebarSource: true,

  canBePinned: false,

  validator: rawChangeRoleMessageInfoValidator,
});
