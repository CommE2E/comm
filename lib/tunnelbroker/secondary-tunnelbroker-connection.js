// @flow

import { type DeviceToTunnelbrokerRequest } from '../types/tunnelbroker/messages.js';

type RemoveCallback = () => void;

export type SecondaryTunnelbrokerConnection = {
  // Used by an inactive tab to send messages
  +sendMessage: (message: DeviceToTunnelbrokerRequest) => mixed,
  // Active tab receives messages from inactive tabs
  +onSendMessage: (
    (message: DeviceToTunnelbrokerRequest) => mixed,
  ) => RemoveCallback,

  // Active tab sets the message status of messages from inactive tabs
  +setMessageStatus: (messageID: string, error: ?string) => mixed,
  // Inactive tabs receive message status and resolve or reject promises
  +onMessageStatus: (
    ((messageID: string, error: ?string) => mixed),
  ) => RemoveCallback,
};
