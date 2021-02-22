// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  RawUpdateRelationshipMessageInfo,
  UpdateRelationshipMessageData,
  UpdateRelationshipMessageInfo,
} from '../../types/messages/update-relationship';
import type { RelativeUserInfo } from '../../types/user-types';
import {
  robotextToRawString,
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import { stringForUser } from '../user-utils';
import { hasMinCodeVersion } from '../version-utils';
import type {
  CreateMessageInfoParams,
  MessageSpec,
  MessageTitleParam,
} from './message-spec';
import { assertSingleMessageInfo } from './utils';

export const updateRelationshipMessageSpec: MessageSpec<
  UpdateRelationshipMessageData,
  RawUpdateRelationshipMessageInfo,
  UpdateRelationshipMessageInfo,
> = Object.freeze({
  messageContent(data: UpdateRelationshipMessageData): string {
    return JSON.stringify({
      operation: data.operation,
      targetID: data.targetID,
    });
  },

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<UpdateRelationshipMessageInfo>) {
    let validMessageInfo: UpdateRelationshipMessageInfo = (messageInfo: UpdateRelationshipMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
      validMessageInfo = {
        ...validMessageInfo,
        target: { ...validMessageInfo.target, isViewer: false },
      };
    }
    return robotextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
  },

  rawMessageInfoFromRow(row: Object): RawUpdateRelationshipMessageInfo {
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.UPDATE_RELATIONSHIP,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      targetID: content.targetID,
      operation: content.operation,
    };
  },

  createMessageInfo(
    rawMessageInfo: RawUpdateRelationshipMessageInfo,
    creator: RelativeUserInfo,
    params: CreateMessageInfoParams,
  ): ?UpdateRelationshipMessageInfo {
    const target = params.createRelativeUserInfos([rawMessageInfo.targetID])[0];
    if (!target) {
      return null;
    }
    return {
      type: messageTypes.UPDATE_RELATIONSHIP,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      target,
      time: rawMessageInfo.time,
      operation: rawMessageInfo.operation,
    };
  },

  rawMessageInfoFromMessageData(
    messageData: UpdateRelationshipMessageData,
    id: string,
  ): RawUpdateRelationshipMessageInfo {
    return { ...messageData, id };
  },

  robotext(messageInfo, creator, params) {
    const target = params.robotextForUser(messageInfo.target);
    if (messageInfo.operation === 'request_sent') {
      return `${creator} sent ${target} a friend request`;
    } else if (messageInfo.operation === 'request_accepted') {
      const targetPossessive = messageInfo.target.isViewer
        ? 'your'
        : `${target}'s`;
      return `${creator} accepted ${targetPossessive} friend request`;
    }
    invariant(
      false,
      `Invalid operation ${messageInfo.operation} ` +
        `of message with type ${messageInfo.type}`,
    );
  },

  shimUnsupportedMessageInfo(rawMessageInfo, platformDetails) {
    if (hasMinCodeVersion(platformDetails, 71)) {
      return rawMessageInfo;
    }
    const { id } = rawMessageInfo;
    invariant(id !== null && id !== undefined, 'id should be set on server');
    return {
      type: messageTypes.UNSUPPORTED,
      id,
      threadID: rawMessageInfo.threadID,
      creatorID: rawMessageInfo.creatorID,
      time: rawMessageInfo.time,
      robotext: 'performed a relationship action',
      unsupportedMessageInfo: rawMessageInfo,
    };
  },

  unshimMessageInfo(unwrapped) {
    return unwrapped;
  },

  notificationTexts(messageInfos, threadInfo) {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    const prefix = stringForUser(messageInfo.creator);
    const title = threadInfo.uiName;
    const body =
      messageInfo.operation === 'request_sent'
        ? 'sent you a friend request'
        : 'accepted your friend request';
    const merged = `${prefix} ${body}`;
    return {
      merged,
      body,
      title,
      prefix,
    };
  },

  generatesNotifs: true,
});
