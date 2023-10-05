// @flow

import type {
  MessageReportCreationRequest,
  MessageReportCreationResult,
} from '../types/message-report-types.js';
import { extractKeyserverIDFromID } from '../utils/action-utils.js';
import type { CallKeyserverEndpoint } from '../utils/keyserver-call.js';
import { useKeyserverCall } from '../utils/keyserver-call.js';

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
    const keyserverID = extractKeyserverIDFromID(input.messageID);
    const requests = { [keyserverID]: input };

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
