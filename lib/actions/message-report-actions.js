// @flow

import { extractKeyserverIDFromIDOptional } from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import type {
  MessageReportCreationRequest,
  MessageReportCreationResult,
} from '../types/message-report-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';

const sendMessageReportActionTypes = Object.freeze({
  started: 'SEND_MESSAGE_REPORT_STARTED',
  success: 'SEND_MESSAGE_REPORT_SUCCESS',
  failed: 'SEND_MESSAGE_REPORT_FAILED',
});
const sendMessageReport =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: MessageReportCreationRequest,
  ) => Promise<MessageReportCreationResult>) =>
  async input => {
    const messageKeyserverID = input.messageID
      ? extractKeyserverIDFromIDOptional(input.messageID)
      : null;
    const keyserverID: string =
      messageKeyserverID ?? authoritativeKeyserverID();
    const messageID = messageKeyserverID ? input.messageID : null;
    const requests = { [keyserverID]: { messageID } };

    const responses = await callKeyserverEndpoint(
      'create_message_report',
      requests,
    );
    const response = responses[keyserverID];

    return { messageInfo: response.messageInfo };
  };

function useSendMessageReport(): (
  input: MessageReportCreationRequest,
) => Promise<MessageReportCreationResult> {
  return useKeyserverCall(sendMessageReport);
}

export { sendMessageReportActionTypes, useSendMessageReport };
