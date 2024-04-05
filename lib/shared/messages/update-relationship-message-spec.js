// @flow

import invariant from 'invariant';
import t from 'tcomb';

import {
  type CreateMessageInfoParams,
  type MessageSpec,
  pushTypes,
} from './message-spec.js';
import { assertSingleMessageInfo } from './utils.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  ClientDBMessageInfo,
  MessageInfo,
} from '../../types/message-types.js';
import {
  type RawLegacyUpdateRelationshipMessageInfo,
  rawLegacyUpdateRelationshipMessageInfoValidator,
  type LegacyUpdateRelationshipMessageData,
  type LegacyUpdateRelationshipMessageInfo,
} from '../../types/messages/legacy-update-relationship.js';
import type {
  RawUpdateRelationshipMessageInfo,
  UpdateRelationshipMessageData,
  UpdateRelationshipMessageInfo,
} from '../../types/messages/update-relationship.js';
import { rawUpdateRelationshipMessageInfoValidator } from '../../types/messages/update-relationship.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { type EntityText, ET } from '../../utils/entity-text.js';

type UpdateRelationshipMessageSpec = MessageSpec<
  LegacyUpdateRelationshipMessageData | UpdateRelationshipMessageData,
  RawLegacyUpdateRelationshipMessageInfo | RawUpdateRelationshipMessageInfo,
  LegacyUpdateRelationshipMessageInfo | UpdateRelationshipMessageInfo,
> & {
  // We need to explicitly type this as non-optional so that
  // it can be referenced from messageContentForClientDB below
  +messageContentForServerDB: (
    data:
      | LegacyUpdateRelationshipMessageData
      | RawLegacyUpdateRelationshipMessageInfo
      | UpdateRelationshipMessageData
      | RawUpdateRelationshipMessageInfo,
  ) => string,
  ...
};

export const updateRelationshipMessageSpec: UpdateRelationshipMessageSpec =
  Object.freeze({
    messageContentForServerDB(
      data:
        | LegacyUpdateRelationshipMessageData
        | RawLegacyUpdateRelationshipMessageInfo
        | UpdateRelationshipMessageData
        | RawUpdateRelationshipMessageInfo,
    ): string {
      return JSON.stringify({
        operation: data.operation,
        targetID: data.targetID,
      });
    },

    messageContentForClientDB(
      data:
        | RawLegacyUpdateRelationshipMessageInfo
        | RawUpdateRelationshipMessageInfo,
    ): string {
      return updateRelationshipMessageSpec.messageContentForServerDB(data);
    },

    rawMessageInfoFromServerDBRow(
      row: Object,
    ):
      | RawLegacyUpdateRelationshipMessageInfo
      | RawUpdateRelationshipMessageInfo {
      const content = JSON.parse(row.content);
      return {
        type: row.type,
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
    ):
      | RawLegacyUpdateRelationshipMessageInfo
      | RawUpdateRelationshipMessageInfo {
      invariant(
        clientDBMessageInfo.content !== undefined &&
          clientDBMessageInfo.content !== null,
        'content must be defined for UpdateRelationship',
      );
      const content = JSON.parse(clientDBMessageInfo.content);

      const messageType = parseInt(clientDBMessageInfo.type);
      if (messageType === messageTypes.LEGACY_UPDATE_RELATIONSHIP) {
        return {
          type: messageTypes.LEGACY_UPDATE_RELATIONSHIP,
          id: clientDBMessageInfo.id,
          threadID: clientDBMessageInfo.thread,
          time: parseInt(clientDBMessageInfo.time),
          creatorID: clientDBMessageInfo.user,
          targetID: content.targetID,
          operation: content.operation,
        };
      } else {
        return {
          type: messageTypes.UPDATE_RELATIONSHIP,
          id: clientDBMessageInfo.id,
          threadID: clientDBMessageInfo.thread,
          time: parseInt(clientDBMessageInfo.time),
          creatorID: clientDBMessageInfo.user,
          targetID: content.targetID,
          operation: content.operation,
        };
      }
    },

    createMessageInfo(
      rawMessageInfo:
        | RawLegacyUpdateRelationshipMessageInfo
        | RawUpdateRelationshipMessageInfo,
      creator: RelativeUserInfo,
      params: CreateMessageInfoParams,
    ): ?LegacyUpdateRelationshipMessageInfo | ?UpdateRelationshipMessageInfo {
      const target = params.createRelativeUserInfos([
        rawMessageInfo.targetID,
      ])[0];
      if (!target) {
        return null;
      }
      if (rawMessageInfo.type === messageTypes.LEGACY_UPDATE_RELATIONSHIP) {
        return {
          type: messageTypes.LEGACY_UPDATE_RELATIONSHIP,
          id: rawMessageInfo.id,
          threadID: rawMessageInfo.threadID,
          creator,
          target,
          time: rawMessageInfo.time,
          operation: rawMessageInfo.operation,
        };
      } else {
        return {
          type: messageTypes.UPDATE_RELATIONSHIP,
          id: rawMessageInfo.id,
          threadID: rawMessageInfo.threadID,
          creator,
          target,
          time: rawMessageInfo.time,
          operation: rawMessageInfo.operation,
        };
      }
    },

    rawMessageInfoFromMessageData(
      messageData:
        | LegacyUpdateRelationshipMessageData
        | UpdateRelationshipMessageData,
      id: ?string,
    ):
      | RawLegacyUpdateRelationshipMessageInfo
      | RawUpdateRelationshipMessageInfo {
      invariant(id, 'RawUpdateRelationshipMessageInfo needs id');
      return { ...messageData, id };
    },

    // ESLint doesn't recognize that invariant always throws
    // eslint-disable-next-line consistent-return
    robotext(
      messageInfo:
        | LegacyUpdateRelationshipMessageInfo
        | UpdateRelationshipMessageInfo,
    ): EntityText {
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
      } else if (messageInfo.operation === 'farcaster_mutual') {
        return ET`Your connection on Farcaster is on Comm.`;
      }
      invariant(
        false,
        `Invalid operation ${messageInfo.operation} ` +
          `of message with type ${messageInfo.type}`,
      );
    },

    unshimMessageInfo(
      unwrapped:
        | RawLegacyUpdateRelationshipMessageInfo
        | RawUpdateRelationshipMessageInfo,
    ):
      | RawLegacyUpdateRelationshipMessageInfo
      | RawUpdateRelationshipMessageInfo {
      return unwrapped;
    },

    async notificationTexts(
      messageInfos: $ReadOnlyArray<MessageInfo>,
      threadInfo: ThreadInfo,
    ): Promise<NotifTexts> {
      const messageInfo = assertSingleMessageInfo(messageInfos);
      const creator = ET.user({ userInfo: messageInfo.creator });
      const prefix = ET`${creator}`;
      const title = threadInfo.uiName;

      let body;
      if (messageInfo.operation === 'request_sent') {
        body = 'sent you a friend request';
      } else if (messageInfo.operation === 'request_accepted') {
        body = 'accepted your friend request';
      } else if (messageInfo.operation === 'farcaster_mutual') {
        body = 'from Farcaster is on Comm';
      } else {
        invariant(false, 'unknown messageInfo.operation in notificationTexts');
      }

      const merged = ET`${prefix} ${body}`;
      return {
        merged,
        body,
        title,
        prefix,
      };
    },

    generatesNotifs: async () => pushTypes.NOTIF,

    canBeSidebarSource: true,

    canBePinned: false,

    validator: t.union([
      rawLegacyUpdateRelationshipMessageInfoValidator,
      rawUpdateRelationshipMessageInfoValidator,
    ]),
  });
