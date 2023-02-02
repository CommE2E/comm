// @flow

import invariant from 'invariant';

import type { PlatformDetails } from '../../types/device-types';
import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported';
import type {
  RawUpdateRelationshipMessageInfo,
  UpdateRelationshipMessageData,
  UpdateRelationshipMessageInfo,
} from '../../types/messages/update-relationship';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import {
  ET,
  type EntityText,
  entityTextToRawString,
} from '../../utils/entity-text';
import {
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import { stringForUser } from '../user-utils';
import { hasMinCodeVersion } from '../version-utils';
import {
  pushTypes,
  type CreateMessageInfoParams,
  type MessageSpec,
  type MessageTitleParam,
} from './message-spec';
import { assertSingleMessageInfo } from './utils';

export const updateRelationshipMessageSpec: MessageSpec<
  UpdateRelationshipMessageData,
  RawUpdateRelationshipMessageInfo,
  UpdateRelationshipMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: UpdateRelationshipMessageData | RawUpdateRelationshipMessageInfo,
  ): string {
    return JSON.stringify({
      operation: data.operation,
      targetID: data.targetID,
    });
  },

  messageContentForClientDB(data: RawUpdateRelationshipMessageInfo): string {
    return this.messageContentForServerDB(data);
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
    return entityTextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
  },

  rawMessageInfoFromServerDBRow(row: Object): RawUpdateRelationshipMessageInfo {
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

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawUpdateRelationshipMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined',
    );
    const content = JSON.parse(clientDBMessageInfo.content);
    const rawUpdateRelationshipMessageInfo: RawUpdateRelationshipMessageInfo = {
      type: messageTypes.UPDATE_RELATIONSHIP,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      targetID: content.targetID,
      operation: content.operation,
    };
    return rawUpdateRelationshipMessageInfo;
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
    id: ?string,
  ): RawUpdateRelationshipMessageInfo {
    invariant(id, 'RawUpdateRelationshipMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(messageInfo: UpdateRelationshipMessageInfo): EntityText {
    const creator = ET.user({ userInfo: messageInfo.creator });
    if (messageInfo.operation === 'request_sent') {
      const target = ET.user({ userInfo: messageInfo.target });
      return ET`${creator} sent ${target} a friend request`;
    } else if (messageInfo.operation === 'request_accepted') {
      const targetPossessive = ET.user({
        userInfo: messageInfo.target,
        possessive: true,
      });
      return ET`${creator} accepted ${targetPossessive} friend request`;
    }
    invariant(
      false,
      `Invalid operation ${messageInfo.operation} ` +
        `of message with type ${messageInfo.type}`,
    );
  },

  shimUnsupportedMessageInfo(
    rawMessageInfo: RawUpdateRelationshipMessageInfo,
    platformDetails: ?PlatformDetails,
  ): RawUpdateRelationshipMessageInfo | RawUnsupportedMessageInfo {
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

  unshimMessageInfo(
    unwrapped: RawUpdateRelationshipMessageInfo,
  ): RawUpdateRelationshipMessageInfo {
    return unwrapped;
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): NotifTexts {
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

  generatesNotifs: async () => pushTypes.NOTIF,
});
