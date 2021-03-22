// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type { MessageInfo } from '../../types/message-types';
import type {
  RawRemoveMembersMessageInfo,
  RemoveMembersMessageData,
  RemoveMembersMessageInfo,
} from '../../types/messages/remove-members';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import { values } from '../../utils/objects';
import {
  robotextForMessageInfo,
  robotextToRawString,
  removeCreatorAsViewer,
} from '../message-utils';
import type {
  CreateMessageInfoParams,
  MessageSpec,
  MessageTitleParam,
  NotificationTextsParams,
  RobotextParams,
} from './message-spec';
import { joinResult } from './utils';

export const removeMembersMessageSpec: MessageSpec<
  RemoveMembersMessageData,
  RawRemoveMembersMessageInfo,
  RemoveMembersMessageInfo,
> = Object.freeze({
  messageContent(data: RemoveMembersMessageData): string {
    return JSON.stringify(data.removedUserIDs);
  },

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<RemoveMembersMessageInfo>) {
    let validMessageInfo: RemoveMembersMessageInfo = (messageInfo: RemoveMembersMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
      validMessageInfo = {
        ...validMessageInfo,
        removedMembers: validMessageInfo.removedMembers.map(item => ({
          ...item,
          isViewer: false,
        })),
      };
    }
    return robotextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
  },

  rawMessageInfoFromRow(row: Object): RawRemoveMembersMessageInfo {
    return {
      type: messageTypes.REMOVE_MEMBERS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      removedUserIDs: JSON.parse(row.content),
    };
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
    id: string,
  ): RawRemoveMembersMessageInfo {
    return { ...messageData, id };
  },

  robotext(
    messageInfo: RemoveMembersMessageInfo,
    creator: string,
    params: RobotextParams,
  ): string {
    const users = messageInfo.removedMembers;
    invariant(users.length !== 0, 'removed who??');
    const removedUsersString = params.robotextForUsers(users);
    return `${creator} removed ${removedUsersString}`;
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
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

  notificationCollapseKey(rawMessageInfo: RawRemoveMembersMessageInfo): string {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
    );
  },

  generatesNotifs: false,

  userIDs(rawMessageInfo: RawRemoveMembersMessageInfo): $ReadOnlyArray<string> {
    return rawMessageInfo.removedUserIDs;
  },
});
