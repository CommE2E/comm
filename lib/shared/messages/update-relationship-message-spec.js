// @flow

import invariant from 'invariant';
import t from 'tcomb';

import {
  type CreateMessageInfoParams,
  type MessageSpec,
  type MergeRobotextMessageItemResult,
  pushTypes,
} from './message-spec.js';
import { assertSingleMessageInfo } from './utils.js';
import type { RobotextChatMessageInfoItem } from '../../selectors/chat-selectors.js';
import type { PlatformDetails } from '../../types/device-types.js';
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
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported.js';
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
import { hasMinCodeVersion } from '../version-utils.js';

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
      if (
        data.type === messageTypes.UPDATE_RELATIONSHIP &&
        data.operation === 'farcaster_mutual'
      ) {
        return JSON.stringify({
          operation: data.operation,
          targetID: data.targetID,
          creatorFID: data.creatorFID,
          targetFID: data.targetFID,
        });
      }
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

      if (content.operation === 'farcaster_mutual') {
        return {
          type: row.type,
          id: row.id.toString(),
          threadID: row.threadID.toString(),
          time: row.time,
          creatorID: row.creatorID.toString(),
          targetID: content.targetID,
          operation: content.operation,
          creatorFID: content.creatorFID,
          targetFID: content.targetFID,
        };
      }

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
      } else if (content.operation === 'farcaster_mutual') {
        return {
          type: messageTypes.UPDATE_RELATIONSHIP,
          id: clientDBMessageInfo.id,
          threadID: clientDBMessageInfo.thread,
          time: parseInt(clientDBMessageInfo.time),
          creatorID: clientDBMessageInfo.user,
          targetID: content.targetID,
          operation: content.operation,
          creatorFID: content.creatorFID,
          targetFID: content.targetFID,
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
      } else if (rawMessageInfo.operation === 'farcaster_mutual') {
        return {
          type: messageTypes.UPDATE_RELATIONSHIP,
          id: rawMessageInfo.id,
          threadID: rawMessageInfo.threadID,
          creator,
          creatorFID: rawMessageInfo.creatorFID,
          target,
          targetFID: rawMessageInfo.targetFID,
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
        const viewerIsCreator = messageInfo.creator.isViewer;
        if (viewerIsCreator) {
          const otherUser = ET.user({ userInfo: messageInfo.target });
          return ET`${otherUser} is ${ET.fcUser({
            fid: messageInfo.targetFID,
          })} on Farcaster`;
        } else {
          return ET`${creator} is ${ET.fcUser({
            fid: messageInfo.creatorFID,
          })} on Farcaster`;
        }
      }
      invariant(
        false,
        `Invalid operation ${messageInfo.operation} ` +
          `of message with type ${messageInfo.type}`,
      );
    },

    shimUnsupportedMessageInfo(
      rawMessageInfo:
        | RawUpdateRelationshipMessageInfo
        | RawLegacyUpdateRelationshipMessageInfo,
      platformDetails: ?PlatformDetails,
    ):
      | RawLegacyUpdateRelationshipMessageInfo
      | RawUpdateRelationshipMessageInfo
      | RawUnsupportedMessageInfo {
      if (rawMessageInfo.type === messageTypes.LEGACY_UPDATE_RELATIONSHIP) {
        return rawMessageInfo;
      } else if (
        rawMessageInfo.type === messageTypes.UPDATE_RELATIONSHIP &&
        hasMinCodeVersion(platformDetails, {
          native: 341,
          web: 81,
        })
      ) {
        return rawMessageInfo;
      } else if (
        rawMessageInfo.type === messageTypes.UPDATE_RELATIONSHIP &&
        rawMessageInfo.operation !== 'farcaster_mutual'
      ) {
        return {
          ...rawMessageInfo,
          type: messageTypes.LEGACY_UPDATE_RELATIONSHIP,
          operation: rawMessageInfo.operation,
        };
      } else {
        return {
          type: messageTypes.UNSUPPORTED,
          id: rawMessageInfo.id,
          threadID: rawMessageInfo.threadID,
          creatorID: rawMessageInfo.creatorID,
          time: rawMessageInfo.time,
          robotext: 'Your connection on Farcaster is on Comm.',
          unsupportedMessageInfo: rawMessageInfo,
          dontPrefixCreator: true,
        };
      }
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
      if (
        messageInfo.type === messageTypes.UPDATE_RELATIONSHIP &&
        messageInfo.operation === 'farcaster_mutual'
      ) {
        const title = threadInfo.uiName;
        const prefix = ET`${ET.fcUser({ fid: messageInfo.creatorFID })}`;
        const body = 'from Farcaster is on Comm';
        const merged = ET`${prefix} ${body}`;
        return { merged, body, title, prefix };
      }

      const creator = ET.user({ userInfo: messageInfo.creator });
      const prefix = ET`${creator}`;
      const title = threadInfo.uiName;

      let body;
      if (messageInfo.operation === 'request_sent') {
        body = 'sent you a friend request';
      } else if (messageInfo.operation === 'request_accepted') {
        body = 'accepted your friend request';
      } else {
        invariant(false, 'unknown messageInfo.operation in notificationTexts');
      }

      const merged = ET`${prefix} ${body}`;
      return { merged, body, title, prefix };
    },

    generatesNotifs: async () => pushTypes.NOTIF,

    canBeSidebarSource: true,

    canBePinned: false,

    validator: t.union([
      rawLegacyUpdateRelationshipMessageInfoValidator,
      rawUpdateRelationshipMessageInfoValidator,
    ]),

    mergeIntoPrecedingRobotextMessageItem(
      messageInfo:
        | LegacyUpdateRelationshipMessageInfo
        | UpdateRelationshipMessageInfo,
      precedingMessageInfoItem: RobotextChatMessageInfoItem,
    ): MergeRobotextMessageItemResult {
      if (
        messageInfo.type !== messageTypes.UPDATE_RELATIONSHIP ||
        messageInfo.operation !== 'farcaster_mutual' ||
        precedingMessageInfoItem.messageInfos.length !== 1 ||
        precedingMessageInfoItem.messageInfos[0].type !==
          messageTypes.CREATE_THREAD
      ) {
        return { shouldMerge: false };
      }
      const createThreadMessageInfo = precedingMessageInfoItem.messageInfos[0];

      const viewerIsCreator = messageInfo.creator.isViewer;
      const farcasterFriendFID = viewerIsCreator
        ? messageInfo.targetFID
        : messageInfo.creatorFID;
      const farcasterFriend = ET.fcUser({ fid: farcasterFriendFID });

      const startingText = 'Comm auto-created this chat with';
      const endingText = 'from Farcaster';
      const newRobotext = ET`${startingText} ${farcasterFriend} ${endingText}`;

      const mergedItem = {
        ...precedingMessageInfoItem,
        messageInfos: [messageInfo, createThreadMessageInfo],
        robotext: newRobotext,
      };
      return { shouldMerge: true, item: mergedItem };
    },
  });
