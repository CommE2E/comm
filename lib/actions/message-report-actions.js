// @flow

import type {
  MessageReportCreationRequest,
  MessageReportCreationResult,
} from '../types/message-report-types';
import type { CallServerEndpoint } from '../utils/call-server-endpoint';

const sendMessageReportActionTypes = Object.freeze({
  started: 'SEND_MESSAGE_REPORT_STARTED',
  success: 'SEND_MESSAGE_REPORT_SUCCESS',
  failed: 'SEND_MESSAGE_REPORT_FAILED',
});
const sendMessageReport = (
  callServerEndpoint: CallServerEndpoint,
): ((
  request: MessageReportCreationRequest,
) => Promise<MessageReportCreationResult>) => async request => {
  return await callServerEndpoint('create_message_report', request);
};

export { sendMessageReportActionTypes, sendMessageReport };
