// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type { TunnelbrokerSocketState } from '../../../tunnelbroker/tunnelbroker-context.js';
import type {
  DMChangeThreadSettingsOperation,
  DMSendEditMessageOperation,
  DMThreadSettingsChanges,
} from '../../../types/dm-ops.js';
import { thickThreadTypes } from '../../../types/thread-types-enum.js';
import type { ChangeThreadSettingsPayload } from '../../../types/thread-types.js';
import { SendMessageError } from '../../../utils/errors.js';
import {
  dmOperationSpecificationTypes,
  type OutboundDMOperationSpecification,
} from '../../dm-ops/dm-op-types.js';
import {
  type ProtocolSendTextMessageInput,
  type SendMultimediaMessageUtils,
  type SendTextMessageUtils,
  type ThreadProtocol,
  type ProtocolSendMultimediaMessageInput,
  type ProtocolEditTextMessageInput,
  type EditTextMessageUtils,
  type ProtocolChangeThreadSettingsInput,
  type ChangeThreadSettingsUtils,
} from '../thread-spec.js';

const dmThreadProtocol: ThreadProtocol = Object.freeze({
  sendTextMessage: async (
    message: ProtocolSendTextMessageInput,
    utils: SendTextMessageUtils,
  ) => {
    const { messageInfo, threadInfo, parentThreadInfo } = message;
    const { localID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );

    const messageID = uuid.v4();
    const time = Date.now();

    const recipients =
      threadInfo.type === thickThreadTypes.THICK_SIDEBAR && parentThreadInfo
        ? parentThreadInfo.members
        : threadInfo.members;
    const recipientsIDs = recipients.map(recipient => recipient.id);

    const result = await utils.sendComposableDMOperation({
      type: dmOperationSpecificationTypes.OUTBOUND,
      op: {
        type: 'send_text_message',
        threadID: threadInfo.id,
        creatorID: messageInfo.creatorID,
        time,
        messageID,
        text: messageInfo.text,
      },
      // We need to use a different mechanism than `all_thread_members`
      // because when creating a thread, the thread might not yet
      // be in the store.
      recipients: {
        type: 'some_users',
        userIDs: recipientsIDs,
      },
      sendOnly: true,
      composableMessageID: localID,
    });

    if (result.result === 'failure' && result.failedMessageIDs.length > 0) {
      const error = new SendMessageError(
        'Failed to send message to all peers',
        localID,
        messageInfo.threadID,
      );
      error.failedOutboundP2PMessageIDs = result.failedMessageIDs;
      throw error;
    }
    return {
      localID,
      serverID: messageID,
      threadID: messageInfo.threadID,
      time,
    };
  },

  sendMultimediaMessage: async (
    message: ProtocolSendMultimediaMessageInput,
    utils: SendMultimediaMessageUtils,
  ) => {
    const { messageInfo, threadInfo } = message;
    const { localID } = messageInfo;
    invariant(
      localID !== null && localID !== undefined,
      'localID should be set',
    );

    const messageID = uuid.v4();
    const time = Date.now();

    const result = await utils.sendComposableDMOperation({
      type: dmOperationSpecificationTypes.OUTBOUND,
      op: {
        type: 'send_multimedia_message',
        threadID: threadInfo.id,
        creatorID: messageInfo.creatorID,
        time: Date.now(),
        messageID,
        media: messageInfo.media,
      },
      recipients: {
        type: 'all_thread_members',
        threadID:
          threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
          threadInfo.parentThreadID
            ? threadInfo.parentThreadID
            : threadInfo.id,
      },
      sendOnly: true,
      composableMessageID: localID,
    });

    if (result.result === 'failure' && result.failedMessageIDs.length > 0) {
      const error = new SendMessageError(
        'Failed to send message to all peers',
        localID,
        messageInfo.threadID,
      );
      error.failedOutboundP2PMessageIDs = result.failedMessageIDs;
      throw error;
    }
    return {
      result: {
        localID,
        serverID: messageID,
        threadID: messageInfo.threadID,
        time,
      },
    };
  },

  editTextMessage: async (
    message: ProtocolEditTextMessageInput,
    utils: EditTextMessageUtils,
  ) => {
    const { viewerID, threadInfo, messageID, newText } = message;
    invariant(viewerID, 'viewerID should be set');
    const op: DMSendEditMessageOperation = {
      type: 'send_edit_message',
      threadID: threadInfo.id,
      creatorID: viewerID,
      time: Date.now(),
      messageID: uuid.v4(),
      targetMessageID: messageID,
      text: newText,
    };
    const opSpecification: OutboundDMOperationSpecification = {
      type: dmOperationSpecificationTypes.OUTBOUND,
      op,
      recipients: {
        type: 'all_thread_members',
        threadID:
          threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
          threadInfo.parentThreadID
            ? threadInfo.parentThreadID
            : threadInfo.id,
      },
    };
    await utils.processAndSendDMOperation(opSpecification);
  },

  changeThreadSettings: async (
    protocolInput: ProtocolChangeThreadSettingsInput,
    utils: ChangeThreadSettingsUtils,
  ) => {
    const { viewerID, input } = protocolInput;
    invariant(viewerID, 'viewerID should be set');

    const changes: { ...DMThreadSettingsChanges } = {};
    if (input.changes.name) {
      changes.name = input.changes.name;
    }
    if (input.changes.description) {
      changes.description = input.changes.description;
    }
    if (input.changes.color) {
      changes.color = input.changes.color;
    }
    if (input.changes.avatar && input.changes.avatar.type === 'emoji') {
      changes.avatar = {
        type: 'emoji',
        emoji: input.changes.avatar.emoji,
        color: input.changes.avatar.color,
      };
    } else if (input.changes.avatar && input.changes.avatar.type === 'ens') {
      changes.avatar = { type: 'ens' };
    } else if (
      input.changes.avatar &&
      input.changes.avatar.type === 'non_keyserver_image'
    ) {
      changes.avatar = {
        type: 'encrypted_image',
        blobURI: input.changes.avatar.blobURI,
        thumbHash: input.changes.avatar.thumbHash,
        encryptionKey: input.changes.avatar.encryptionKey,
      };
    } else if (input.changes.avatar && input.changes.avatar.type === 'remove') {
      changes.avatar = null;
    }

    const { threadInfo } = input;
    const op: DMChangeThreadSettingsOperation = {
      type: 'change_thread_settings',
      threadID: threadInfo.id,
      editorID: viewerID,
      time: Date.now(),
      changes,
      messageIDsPrefix: uuid.v4(),
    };
    const opSpecification: OutboundDMOperationSpecification = {
      type: dmOperationSpecificationTypes.OUTBOUND,
      op,
      recipients: {
        type: 'all_thread_members',
        threadID:
          threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
          threadInfo.parentThreadID
            ? threadInfo.parentThreadID
            : threadInfo.id,
      },
    };

    await utils.processAndSendDMOperation(opSpecification);
    return ({
      threadID: threadInfo.id,
      updatesResult: { newUpdates: [] },
      newMessageInfos: [],
    }: ChangeThreadSettingsPayload);
  },

  supportsCalendarHistory: false,

  calendarIsOnline: (tunnelbrokerSocketState: TunnelbrokerSocketState) =>
    !!tunnelbrokerSocketState.connected,
});

export { dmThreadProtocol };
