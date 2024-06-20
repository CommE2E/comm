// @flow

import type { MessageToDeviceRequest } from '../types/tunnelbroker/message-to-device-request-types.js';
import type { MessageToTunnelbrokerRequest } from '../types/tunnelbroker/message-to-tunnelbroker-request-types.js';

type RemoveCallback = () => void;

export type SecondaryTunnelbrokerConnection = {
  // Used by an inactive tab to send messages
  +sendMessage: (
    MessageToDeviceRequest | MessageToTunnelbrokerRequest,
  ) => mixed,
  // Active tab receives messages from inactive tabs
  +onSendMessage: (
    (MessageToDeviceRequest | MessageToTunnelbrokerRequest) => mixed,
  ) => RemoveCallback,

  // Active tab sets the message status of messages from inactive tabs
  +setMessageStatus: (messageID: string, error: ?string) => mixed,
  // Inactive tabs receive message status and resolve or reject promises
  +onMessageStatus: (
    ((messageID: string, error: ?string) => mixed),
  ) => RemoveCallback,
};
