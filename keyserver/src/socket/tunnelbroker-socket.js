// @flow

import _debounce from 'lodash/debounce.js';
import uuid from 'uuid';
import WebSocket from 'ws';

import { tunnelbrokerHeartbeatTimeout } from 'lib/shared/timeouts.js';
import type { ClientMessageToDevice } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type { MessageReceiveConfirmation } from 'lib/types/tunnelbroker/message-receive-confirmation-types.js';
import type { MessageSentStatus } from 'lib/types/tunnelbroker/message-to-device-request-status-types.js';
import type { MessageToDeviceRequest } from 'lib/types/tunnelbroker/message-to-device-request-types.js';
import {
  type TunnelbrokerMessage,
  tunnelbrokerMessageTypes,
  tunnelbrokerMessageValidator,
} from 'lib/types/tunnelbroker/messages.js';
import {
  type RefreshKeyRequest,
  refreshKeysRequestValidator,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import type { ConnectionInitializationMessage } from 'lib/types/tunnelbroker/session-types.js';
import type { Heartbeat } from 'lib/types/websocket/heartbeat-types.js';

import { uploadNewOneTimeKeys } from '../utils/olm-utils.js';

type PromiseCallbacks = {
  +resolve: () => void,
  +reject: (error: string) => void,
};
type Promises = { [clientMessageID: string]: PromiseCallbacks };

class TunnelbrokerSocket {
  ws: WebSocket;
  connected: boolean = false;
  closed: boolean = false;
  promises: Promises = {};
  heartbeatTimeoutID: ?TimeoutID;
  oneTimeKeysPromise: ?Promise<void>;

  constructor(
    socketURL: string,
    initMessage: ConnectionInitializationMessage,
    onClose: () => mixed,
  ) {
    const socket = new WebSocket(socketURL);

    socket.on('open', () => {
      if (!this.closed) {
        socket.send(JSON.stringify(initMessage));
      }
    });

    socket.on('close', async () => {
      if (this.closed) {
        return;
      }
      this.closed = true;
      this.connected = false;
      this.stopHeartbeatTimeout();
      console.error('Connection to Tunnelbroker closed');
      onClose();
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

    this.resetHeartbeatTimeout();

    if (
      message.type ===
      tunnelbrokerMessageTypes.CONNECTION_INITIALIZATION_RESPONSE
    ) {
      if (message.status.type === 'Success' && !this.connected) {
        this.connected = true;
        console.info('session with Tunnelbroker created');
      } else if (message.status.type === 'Success' && this.connected) {
        console.info(
          'received ConnectionInitializationResponse with status: Success for already connected socket',
        );
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
          this.debouncedRefreshOneTimeKeys(request.numberOfKeys);
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
          if (this.promises[status.data]) {
            this.promises[status.data].resolve();
            delete this.promises[status.data];
          } else {
            console.log(
              'received successful response for a non-existent request',
            );
          }
        } else if (status.type === 'Error') {
          if (this.promises[status.data.id]) {
            this.promises[status.data.id].reject(status.data.error);
            delete this.promises[status.data.id];
          } else {
            console.log('received error response for a non-existent request');
          }
        } else if (status.type === 'SerializationError') {
          console.error('SerializationError for message: ', status.data);
        } else if (status.type === 'InvalidRequest') {
          console.log('Tunnelbroker recorded InvalidRequest');
        }
      }
    } else if (message.type === tunnelbrokerMessageTypes.HEARTBEAT) {
      console.log('TB heartbeat message received');
      const heartbeat: Heartbeat = {
        type: tunnelbrokerMessageTypes.HEARTBEAT,
      };
      this.ws.send(JSON.stringify(heartbeat));
    }
  };

  refreshOneTimeKeys: (numberOfKeys: number) => void = numberOfKeys => {
    const oldOneTimeKeysPromise = this.oneTimeKeysPromise;
    this.oneTimeKeysPromise = (async () => {
      await oldOneTimeKeysPromise;
      await uploadNewOneTimeKeys(numberOfKeys);
    })();
  };

  debouncedRefreshOneTimeKeys: (numberOfKeys: number) => void = _debounce(
    this.refreshOneTimeKeys,
    100,
    { leading: true, trailing: true },
  );

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

  stopHeartbeatTimeout() {
    if (this.heartbeatTimeoutID) {
      clearTimeout(this.heartbeatTimeoutID);
      this.heartbeatTimeoutID = null;
    }
  }

  resetHeartbeatTimeout() {
    this.stopHeartbeatTimeout();
    this.heartbeatTimeoutID = setTimeout(() => {
      this.ws.close();
      this.connected = false;
    }, tunnelbrokerHeartbeatTimeout);
  }
}

export default TunnelbrokerSocket;
