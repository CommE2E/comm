// @flow

import type { MessageToDeviceRequest } from '../types/tunnelbroker/message-to-device-request-types.js';
import type { MessageToTunnelbrokerRequest } from '../types/tunnelbroker/message-to-tunnelbroker-request-types.js';
import type { TunnelbrokerAPNsNotif } from '../types/tunnelbroker/notif-types.js';

type RemoveCallback = () => void;

export type SecondaryTunnelbrokerConnection = {
  // Used by an inactive tab to send messages
  +sendMessage: (
    message:
      | MessageToDeviceRequest
      | MessageToTunnelbrokerRequest
      | TunnelbrokerAPNsNotif,
  ) => mixed,
  // Active tab receives messages from inactive tabs
  +onSendMessage: (
    (
      message:
        | MessageToDeviceRequest
        | MessageToTunnelbrokerRequest
        | TunnelbrokerAPNsNotif,
    ) => mixed,
  ) => RemoveCallback,

  // Active tab sets the message status of messages from inactive tabs
  +setMessageStatus: (messageID: string, error: ?string) => mixed,
  // Inactive tabs receive message status and resolve or reject promises
  +onMessageStatus: (
    ((messageID: string, error: ?string) => mixed),
  ) => RemoveCallback,
};
