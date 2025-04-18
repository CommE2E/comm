// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import { thickThreadTypes } from '../../../types/thread-types-enum.js';
import { SendMessageError } from '../../../utils/errors.js';
import { dmOperationSpecificationTypes } from '../../dm-ops/dm-op-types.js';
import {
  type ProtocolSendTextMessageInput,
  type SendTextMessageUtils,
  type ThreadProtocol,
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
});

export { dmThreadProtocol };
