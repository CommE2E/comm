// @flow

import type { MessageToDeviceRequest } from '../types/tunnelbroker/message-to-device-request-types';

type RemoveCallback = () => void;

export type SecondaryTunnelbrokerConnection = {
  // Used by an inactive tab to send messages
  sendMessage: MessageToDeviceRequest => mixed,
  // Active tab receives messages from inactive tabs
  onSendMessage: ((MessageToDeviceRequest) => mixed) => RemoveCallback,

  // Active tab sets the message status of messages from inactive tabs
  setMessageStatus: (messageID: string, error: ?string) => mixed,
  // Inactive tabs receive message status and resolve or reject promises
  onMessageStatus: (
    ((messageID: string, error: ?string) => mixed),
  ) => RemoveCallback,
};
