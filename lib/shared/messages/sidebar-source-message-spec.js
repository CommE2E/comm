// @flow

import invariant from 'invariant';

import {
  messageNotifyTypes,
  type CreateMessageInfoParams,
  type MessageSpec,
  type RawMessageInfoFromServerDBRowParams,
} from './message-spec.js';
import { joinResult } from './utils.js';
import { messageTypes } from '../../types/message-types-enum.js';
import {
  type RawSidebarSourceMessageInfo,
  type SidebarSourceMessageData,
  type SidebarSourceMessageInfo,
  type ClientDBMessageInfo,
  rawSidebarSourceMessageInfoValidator,
} from '../../types/message-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { isInvalidSidebarSource } from '../message-utils.js';

export const sidebarSourceMessageSpec: MessageSpec<
  SidebarSourceMessageData,
  RawSidebarSourceMessageInfo,
  SidebarSourceMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: SidebarSourceMessageData | RawSidebarSourceMessageInfo,
  ): string {
    const sourceMessageID = data.sourceMessage?.id;
    invariant(sourceMessageID, 'Source message id should be set');
    return JSON.stringify({
      sourceMessageID,
    });
  },

  messageContentForClientDB(data: RawSidebarSourceMessageInfo): string {
    invariant(
      data.sourceMessage && data.sourceMessage.id,
      'sourceMessage and sourceMessage.id should be defined',
    );
    return JSON.stringify(data.sourceMessage);
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawSidebarSourceMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined for SidebarSource',
    );
    const sourceMessage = JSON.parse(clientDBMessageInfo.content);
    const rawSidebarSourceMessageInfo: RawSidebarSourceMessageInfo = {
      type: messageTypes.SIDEBAR_SOURCE,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      sourceMessage,
    };
    return rawSidebarSourceMessageInfo;
  },

  messageTitle() {
    invariant(false, 'Cannot call messageTitle on sidebarSourceMessageSpec');
  },

  rawMessageInfoFromServerDBRow(
    row: Object,
    params: RawMessageInfoFromServerDBRowParams,
  ): RawSidebarSourceMessageInfo {
    const { derivedMessages } = params;
    invariant(derivedMessages, 'Derived messages should be provided');

    const content = JSON.parse(row.content);
    let sourceMessage = derivedMessages.get(content.sourceMessageID);
    if (!sourceMessage || isInvalidSidebarSource(sourceMessage)) {
      console.warn(
        `Message with id ${row.id} has a derived message ` +
          `${content.sourceMessageID} which is not present in the database`,
      );

      sourceMessage = undefined;
    }

    return {
      type: messageTypes.SIDEBAR_SOURCE,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      sourceMessage,
    };
  },

  createMessageInfo(
    rawMessageInfo: RawSidebarSourceMessageInfo,
    creator: RelativeUserInfo,
    params: CreateMessageInfoParams,
  ): ?SidebarSourceMessageInfo {
    if (!rawMessageInfo.sourceMessage) {
      return null;
    }
    const sourceMessage = params.createMessageInfoFromRaw(
      rawMessageInfo.sourceMessage,
    );
    invariant(
      sourceMessage && !isInvalidSidebarSource(sourceMessage),
      'Sidebars can not be created from SIDEBAR SOURCE, REACTION, EDIT OR PIN MESSAGE',
    );

    return {
      type: messageTypes.SIDEBAR_SOURCE,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      sourceMessage,
    };
  },

  rawMessageInfoFromMessageData(
    messageData: SidebarSourceMessageData,
    id: ?string,
  ): RawSidebarSourceMessageInfo {
    invariant(id, 'RawSidebarSourceMessageInfo needs id');
    return { ...messageData, id };
  },

  notificationTexts(): Promise<NotifTexts> {
    invariant(
      false,
      'SIDEBAR_SOURCE notificationTexts should never be called directly!',
    );
  },

  notificationCollapseKey(rawMessageInfo: RawSidebarSourceMessageInfo): string {
    return joinResult(messageTypes.CREATE_SIDEBAR, rawMessageInfo.threadID);
  },

  getMessageNotifyType: async () => messageNotifyTypes.NOTIF_AND_SET_UNREAD,

  startsThread: true,

  canBeSidebarSource: false,

  canBePinned: false,

  parseDerivedMessages(row: Object, requiredIDs: Set<string>): void {
    try {
      const content = JSON.parse(row.content);
      requiredIDs.add(content.sourceMessageID);
    } catch (e) {
      console.error(
        `Error parsing content of message with id ${row.id}: ${e.message}`,
      );
    }
  },

  validator: rawSidebarSourceMessageInfoValidator,
});
