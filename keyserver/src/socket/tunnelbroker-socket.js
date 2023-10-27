// @flow

import uuid from 'uuid';
import WebSocket from 'ws';

import type { ClientMessageToDevice } from 'lib/tunnelbroker/tunnelbroker-context.js';
import {
  type RefreshKeyRequest,
  refreshKeysRequestValidator,
} from 'lib/types/tunnelbroker/keys-types.js';
import type { MessageReceiveConfirmation } from 'lib/types/tunnelbroker/message-receive-confirmation-types.js';
import type { MessageSentStatus } from 'lib/types/tunnelbroker/message-to-device-request-status-types.js';
import type { MessageToDeviceRequest } from 'lib/types/tunnelbroker/message-to-device-request-types.js';
import {
  type TunnelbrokerMessage,
  tunnelbrokerMessageTypes,
  tunnelbrokerMessageValidator,
} from 'lib/types/tunnelbroker/messages.js';
import type { ConnectionInitializationMessage } from 'lib/types/tunnelbroker/session-types.js';

import { uploadNewOneTimeKeys } from '../utils/olm-utils.js';

type PromiseCallbacks = {
  +resolve: () => void,
  +reject: (error: string) => void,
};
type Promises = { [clientMessageID: string]: PromiseCallbacks };

class TunnelbrokerSocket {
  ws: WebSocket;
  connected: boolean;
  promises: Promises;

  constructor(socketURL: string, initMessage: ConnectionInitializationMessage) {
    this.connected = false;
    this.promises = {};

    const socket = new WebSocket(socketURL);

    socket.on('open', () => {
      socket.send(JSON.stringify(initMessage));
    });

    socket.on('close', async () => {
      this.connected = false;
      console.error('Connection to Tunnelbroker closed');
    });

    socket.on('error', (error: Error) => {
      console.error('Tunnelbroker socket error:', error.message);
    });

    socket.on('message', this.onMessage);

    this.ws = socket;
  }

  onMessage: (event: ArrayBuffer) => Promise<void> = async (
    event: ArrayBuffer,
  ) => {
    let rawMessage;
    try {
      rawMessage = JSON.parse(event.toString());
    } catch (e) {
      console.error('error while parsing Tunnelbroker message:', e.message);
      return;
    }

    if (!tunnelbrokerMessageValidator.is(rawMessage)) {
      console.error('invalid TunnelbrokerMessage: ', rawMessage.toString());
      return;
    }
    const message: TunnelbrokerMessage = rawMessage;

    if (
      message.type ===
      tunnelbrokerMessageTypes.CONNECTION_INITIALIZATION_RESPONSE
    ) {
      if (message.status.type === 'Success') {
        this.connected = true;
        console.info('session with Tunnelbroker created');
      } else {
        this.connected = false;
        console.error(
          'creating session with Tunnelbroker error:',
          message.status.data,
        );
      }
    } else if (message.type === tunnelbrokerMessageTypes.MESSAGE_TO_DEVICE) {
      const confirmation: MessageReceiveConfirmation = {
        type: tunnelbrokerMessageTypes.MESSAGE_RECEIVE_CONFIRMATION,
        messageIDs: [message.messageID],
      };
      this.ws.send(JSON.stringify(confirmation));

      const { payload } = message;
      try {
        const messageToKeyserver = JSON.parse(payload);
        if (refreshKeysRequestValidator.is(messageToKeyserver)) {
          const request: RefreshKeyRequest = messageToKeyserver;
          await uploadNewOneTimeKeys(request.numberOfKeys);
        }
      } catch (e) {
        console.error(
          'error while processing message to keyserver:',
          e.message,
        );
      }
    } else if (
      message.type === tunnelbrokerMessageTypes.MESSAGE_TO_DEVICE_REQUEST_STATUS
    ) {
      for (const status: MessageSentStatus of message.clientMessageIDs) {
        if (status.type === 'Success') {
          this.promises[status.data]?.resolve();
          delete this.promises[status.data];
        } else if (status.type === 'Error') {
          this.promises[status.data.id]?.reject(status.data.error);
          delete this.promises[status.data.id];
        } else if (status.type === 'SerializationError') {
          console.error('SerializationError for message: ', status.data);
        } else if (status.type === 'InvalidRequest') {
          console.log('Tunnelbroker recorded InvalidRequest');
        }
      }
    }
  };

  sendMessage: (message: ClientMessageToDevice) => Promise<void> = (
    message: ClientMessageToDevice,
  ) => {
    if (!this.connected) {
      throw new Error('Tunnelbroker not connected');
    }
    const clientMessageID = uuid.v4();
    const messageToDevice: MessageToDeviceRequest = {
      type: tunnelbrokerMessageTypes.MESSAGE_TO_DEVICE_REQUEST,
      clientMessageID,
      deviceID: message.deviceID,
      payload: message.payload,
    };

    return new Promise((resolve, reject) => {
      this.promises[clientMessageID] = {
        resolve,
        reject,
      };
      this.ws.send(JSON.stringify(messageToDevice));
    });
  };
}

export default TunnelbrokerSocket;
