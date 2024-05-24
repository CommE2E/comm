// @flow

import invariant from 'invariant';
import _debounce from 'lodash/debounce.js';
import { getRustAPI } from 'rust-node-addon';
import uuid from 'uuid';
import WebSocket from 'ws';

import { hexToUintArray } from 'lib/media/data-utils.js';
import { tunnelbrokerHeartbeatTimeout } from 'lib/shared/timeouts.js';
import type { TunnelbrokerClientMessageToDevice } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type { MessageReceiveConfirmation } from 'lib/types/tunnelbroker/message-receive-confirmation-types.js';
import type { MessageSentStatus } from 'lib/types/tunnelbroker/message-to-device-request-status-types.js';
import type { MessageToDeviceRequest } from 'lib/types/tunnelbroker/message-to-device-request-types.js';
import {
  type TunnelbrokerMessage,
  tunnelbrokerMessageTypes,
  tunnelbrokerMessageValidator,
} from 'lib/types/tunnelbroker/messages.js';
import {
  qrCodeAuthMessageValidator,
  type RefreshKeyRequest,
  refreshKeysRequestValidator,
  type QRCodeAuthMessage,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import { peerToPeerMessageTypes } from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import {
  type QRCodeAuthMessagePayload,
  qrCodeAuthMessagePayloadValidator,
  qrCodeAuthMessageTypes,
} from 'lib/types/tunnelbroker/qr-code-auth-message-types.js';
import type {
  ConnectionInitializationMessage,
  AnonymousInitializationMessage,
} from 'lib/types/tunnelbroker/session-types.js';
import type { Heartbeat } from 'lib/types/websocket/heartbeat-types.js';
import {
  convertBytesToObj,
  convertObjToBytes,
} from 'lib/utils/conversion-utils.js';

import { fetchOlmAccount } from '../updaters/olm-account-updater.js';
import { saveIdentityInfo } from '../user/identity.js';
import { encrypt, decrypt } from '../utils/aes-crypto-utils.js';
import {
  uploadNewOneTimeKeys,
  getNewDeviceKeyUpload,
  markPrekeysAsPublished,
} from '../utils/olm-utils.js';

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
  userID: ?string;
  accessToken: ?string;
  qrAuthEncryptionKey: ?string;
  primaryDeviceID: ?string;
  justSuccessfullyAuthenticated: boolean = false;
  shouldNotifyPrimary: boolean = false;

  constructor(
    socketURL: string,
    onClose: (boolean, ?string) => mixed,
    userID: ?string,
    deviceID: string,
    accessToken: ?string,
    qrAuthEncryptionKey: ?string,
    primaryDeviceID: ?string,
    justSuccessfullyAuthenticated: boolean,
  ) {
    this.userID = userID;
    this.accessToken = accessToken;
    this.qrAuthEncryptionKey = qrAuthEncryptionKey;
    this.primaryDeviceID = primaryDeviceID;

    if (justSuccessfullyAuthenticated) {
      this.shouldNotifyPrimary = true;
    }

    const socket = new WebSocket(socketURL);

    socket.on('open', () => {
      if (!this.closed) {
        let initMessageString;

        if (userID && accessToken) {
          console.log('Creating authenticated tunnelbroker connection');
          const initMessage: ConnectionInitializationMessage = {
            type: 'ConnectionInitializationMessage',
            deviceID,
            accessToken: accessToken,
            userID: userID,
            deviceType: 'keyserver',
          };
          initMessageString = JSON.stringify(initMessage);
        } else {
          console.log('Creating anonymous tunnelbroker connection');
          const initMessage: AnonymousInitializationMessage = {
            type: 'AnonymousInitializationMessage',
            deviceID,
            deviceType: 'keyserver',
          };
          initMessageString = JSON.stringify(initMessage);
        }

        socket.send(initMessageString);
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
      onClose(this.justSuccessfullyAuthenticated, this.primaryDeviceID);
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
        console.info(
          this.userID && this.accessToken
            ? 'session with Tunnelbroker created'
            : 'anonymous session with Tunnelbroker created',
        );
        if (!this.shouldNotifyPrimary) {
          return;
        }
        const primaryDeviceID = this.primaryDeviceID;
        invariant(
          primaryDeviceID,
          'Primary device ID is not set but should be',
        );
        const payload = await this.encodeQRAuthMessage({
          type: qrCodeAuthMessageTypes.SECONDARY_DEVICE_REGISTRATION_SUCCESS,
        });
        if (!payload) {
          this.closeConnection();
          return;
        }
        await this.sendMessage({
          deviceID: primaryDeviceID,
          payload: JSON.stringify(payload),
        });
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
        if (qrCodeAuthMessageValidator.is(messageToKeyserver)) {
          const request: QRCodeAuthMessage = messageToKeyserver;
          const [qrCodeAuthMessage, rustAPI, accountInfo] = await Promise.all([
            this.parseQRCodeAuthMessage(request),
            getRustAPI(),
            fetchOlmAccount('content'),
          ]);
          if (
            !qrCodeAuthMessage ||
            qrCodeAuthMessage.type !==
              qrCodeAuthMessageTypes.DEVICE_LIST_UPDATE_SUCCESS
          ) {
            return;
          }
          const { primaryDeviceID, userID } = qrCodeAuthMessage;
          this.primaryDeviceID = primaryDeviceID;

          const [nonce, deviceKeyUpload] = await Promise.all([
            rustAPI.generateNonce(),
            getNewDeviceKeyUpload(),
          ]);
          const signedIdentityKeysBlob = {
            payload: deviceKeyUpload.keyPayload,
            signature: deviceKeyUpload.keyPayloadSignature,
          };
          const nonceSignature = accountInfo.account.sign(nonce);

          const identityInfo = await rustAPI.uploadSecondaryDeviceKeysAndLogIn(
            userID,
            nonce,
            nonceSignature,
            signedIdentityKeysBlob,
            deviceKeyUpload.contentPrekey,
            deviceKeyUpload.contentPrekeySignature,
            deviceKeyUpload.notifPrekey,
            deviceKeyUpload.notifPrekeySignature,
            deviceKeyUpload.contentOneTimeKeys,
            deviceKeyUpload.notifOneTimeKeys,
          );
          await Promise.all([
            markPrekeysAsPublished(),
            saveIdentityInfo(identityInfo),
          ]);
          this.justSuccessfullyAuthenticated = true;
          this.closeConnection();
        } else if (refreshKeysRequestValidator.is(messageToKeyserver)) {
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

  sendMessage: (message: TunnelbrokerClientMessageToDevice) => Promise<void> = (
    message: TunnelbrokerClientMessageToDevice,
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

  closeConnection() {
    this.ws.close();
    this.connected = false;
  }

  parseQRCodeAuthMessage: (
    message: QRCodeAuthMessage,
  ) => Promise<?QRCodeAuthMessagePayload> = async message => {
    const encryptionKey = this.qrAuthEncryptionKey;
    if (!encryptionKey) {
      return null;
    }
    const encryptedData = Buffer.from(message.encryptedContent, 'base64');
    const decryptedData = await decrypt(
      hexToUintArray(encryptionKey),
      new Uint8Array(encryptedData),
    );
    const payload = convertBytesToObj<QRCodeAuthMessagePayload>(decryptedData);
    if (!qrCodeAuthMessagePayloadValidator.is(payload)) {
      return null;
    }

    return payload;
  };

  encodeQRAuthMessage: (
    payload: QRCodeAuthMessagePayload,
  ) => Promise<?QRCodeAuthMessage> = async payload => {
    const encryptionKey = this.qrAuthEncryptionKey;
    if (!encryptionKey) {
      console.error('Encryption key missing - cannot send QR auth message.');
      return null;
    }
    const payloadBytes = convertObjToBytes(payload);
    const keyBytes = hexToUintArray(encryptionKey);
    const encryptedBytes = await encrypt(keyBytes, payloadBytes);
    const encryptedContent = Buffer.from(encryptedBytes).toString('base64');
    return Promise.resolve({
      type: peerToPeerMessageTypes.QR_CODE_AUTH_MESSAGE,
      encryptedContent,
    });
  };
}

export default TunnelbrokerSocket;
