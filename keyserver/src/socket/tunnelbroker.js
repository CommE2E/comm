// @flow

import invariant from 'invariant';
import _debounce from 'lodash/debounce.js';
import { getRustAPI } from 'rust-node-addon';
import uuid from 'uuid';
import WebSocket from 'ws';

import { hexToUintArray } from 'lib/media/data-utils.js';
import {
  clientTunnelbrokerSocketReconnectDelay,
  tunnelbrokerHeartbeatTimeout,
} from 'lib/shared/timeouts.js';
import type { TunnelbrokerClientMessageToDevice } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type { MessageSentStatus } from 'lib/types/tunnelbroker/device-to-tunnelbroker-request-status-types.js';
import type { MessageReceiveConfirmation } from 'lib/types/tunnelbroker/message-receive-confirmation-types.js';
import type { MessageToDeviceRequest } from 'lib/types/tunnelbroker/message-to-device-request-types.js';
import {
  deviceToTunnelbrokerMessageTypes,
  tunnelbrokerToDeviceMessageTypes,
  tunnelbrokerToDeviceMessageValidator,
  type TunnelbrokerToDeviceMessage,
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
import { getCommConfig } from 'lib/utils/comm-config.js';
import {
  convertBytesToObj,
  convertObjToBytes,
} from 'lib/utils/conversion-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { verifyMemoryUsage } from 'lib/utils/olm-memory-utils.js';
import sleep from 'lib/utils/sleep.js';

import {
  clearIdentityInfo,
  fetchIdentityInfo,
  saveIdentityInfo,
} from '../user/identity.js';
import type { IdentityInfo } from '../user/identity.js';
import { verifyUserLoggedIn } from '../user/login.js';
import { encrypt, decrypt } from '../utils/aes-crypto-utils.js';
import {
  getContentSigningKey,
  uploadNewOneTimeKeys,
  getNewDeviceKeyUpload,
  markPrekeysAsPublished,
  signUsingOlmAccount,
} from '../utils/olm-utils.js';

type TBConnectionInfo = {
  +url: string,
};

async function getTBConnectionInfo(): Promise<TBConnectionInfo> {
  const tbConfig = await getCommConfig<TBConnectionInfo>({
    folder: 'facts',
    name: 'tunnelbroker',
  });

  if (tbConfig) {
    return tbConfig;
  }

  console.warn('Defaulting to staging Tunnelbroker');
  return {
    url: 'wss://tunnelbroker.staging.commtechnologies.org:51001',
  };
}

async function createAndMaintainTunnelbrokerWebsocket(encryptionKey: ?string) {
  const [deviceID, tbConnectionInfo] = await Promise.all([
    getContentSigningKey(),
    getTBConnectionInfo(),
  ]);
  const createNewTunnelbrokerSocket = async (
    shouldNotifyPrimaryAfterReopening: boolean,
    primaryDeviceID: ?string,
  ) => {
    let identityInfo;
    if (encryptionKey) {
      identityInfo = await fetchIdentityInfo();
    } else {
      // for non-QR flow we can retry login
      identityInfo = await verifyUserLoggedIn();
    }
    new TunnelbrokerSocket({
      socketURL: tbConnectionInfo.url,
      onClose: async (successfullyAuthed: boolean, primaryID: ?string) => {
        await sleep(clientTunnelbrokerSocketReconnectDelay);
        await createNewTunnelbrokerSocket(successfullyAuthed, primaryID);
      },
      identityInfo,
      deviceID,
      qrAuthEncryptionKey: encryptionKey,
      primaryDeviceID,
      shouldNotifyPrimaryAfterReopening,
    });
  };
  await createNewTunnelbrokerSocket(false, null);
}

type TunnelbrokerSocketParams = {
  +socketURL: string,
  +onClose: (boolean, ?string) => mixed,
  +identityInfo: ?IdentityInfo,
  +deviceID: string,
  +qrAuthEncryptionKey: ?string,
  +primaryDeviceID: ?string,
  +shouldNotifyPrimaryAfterReopening: boolean,
};

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
  identityInfo: ?IdentityInfo;
  qrAuthEncryptionKey: ?string;
  primaryDeviceID: ?string;
  shouldNotifyPrimaryAfterReopening: boolean = false;
  shouldNotifyPrimary: boolean = false;

  constructor(tunnelbrokerSocketParams: TunnelbrokerSocketParams) {
    const {
      socketURL,
      onClose,
      identityInfo,
      deviceID,
      qrAuthEncryptionKey,
      primaryDeviceID,
      shouldNotifyPrimaryAfterReopening,
    } = tunnelbrokerSocketParams;

    this.identityInfo = identityInfo;
    this.qrAuthEncryptionKey = qrAuthEncryptionKey;
    this.primaryDeviceID = primaryDeviceID;

    if (shouldNotifyPrimaryAfterReopening) {
      this.shouldNotifyPrimary = true;
    }

    const socket = new WebSocket(socketURL);

    socket.on('open', () => {
      this.onOpen(socket, deviceID);
    });

    socket.on('close', async () => {
      if (this.closed) {
        return;
      }
      this.closed = true;
      this.connected = false;
      this.stopHeartbeatTimeout();
      console.error('Connection to Tunnelbroker closed');
      onClose(this.shouldNotifyPrimaryAfterReopening, this.primaryDeviceID);
    });

    socket.on('error', (error: Error) => {
      console.error('Tunnelbroker socket error:', error.message);
    });

    socket.on('message', this.onMessage);

    this.ws = socket;
  }

  onOpen: (socket: WebSocket, deviceID: string) => void = (
    socket,
    deviceID,
  ) => {
    if (this.closed) {
      return;
    }

    if (this.identityInfo) {
      const initMessage: ConnectionInitializationMessage = {
        type: 'ConnectionInitializationMessage',
        deviceID,
        accessToken: this.identityInfo.accessToken,
        userID: this.identityInfo.userId,
        deviceType: 'keyserver',
      };
      socket.send(JSON.stringify(initMessage));
    } else {
      const initMessage: AnonymousInitializationMessage = {
        type: 'AnonymousInitializationMessage',
        deviceID,
        deviceType: 'keyserver',
      };
      socket.send(JSON.stringify(initMessage));
    }
  };

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

    if (!tunnelbrokerToDeviceMessageValidator.is(rawMessage)) {
      console.error(
        'invalid tunnelbrokerToDeviceMessage: ',
        rawMessage.toString(),
      );
      return;
    }
    const message: TunnelbrokerToDeviceMessage = rawMessage;

    this.resetHeartbeatTimeout();

    if (
      message.type ===
      tunnelbrokerToDeviceMessageTypes.CONNECTION_INITIALIZATION_RESPONSE
    ) {
      if (message.status.type === 'Success' && !this.connected) {
        this.connected = true;
        console.info(
          this.identityInfo
            ? 'session with Tunnelbroker created'
            : 'anonymous session with Tunnelbroker created',
        );
        if (!this.shouldNotifyPrimary) {
          return;
        }
        const { primaryDeviceID } = this;
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
        await this.sendMessageToDevice({
          deviceID: primaryDeviceID,
          payload: JSON.stringify(payload),
        });
      } else if (message.status.type === 'Success' && this.connected) {
        console.info(
          'received ConnectionInitializationResponse with status: Success for already connected socket',
        );
      } else {
        if (message.status.data?.includes('UnauthorizedDevice')) {
          await clearIdentityInfo();
          this.closeConnection();
          return;
        }
        this.connected = false;
        console.error(
          'creating session with Tunnelbroker error:',
          message.status.data,
        );
      }
    } else if (
      message.type === tunnelbrokerToDeviceMessageTypes.MESSAGE_TO_DEVICE
    ) {
      const confirmation: MessageReceiveConfirmation = {
        type: deviceToTunnelbrokerMessageTypes.MESSAGE_RECEIVE_CONFIRMATION,
        messageIDs: [message.messageID],
      };
      this.ws.send(JSON.stringify(confirmation));

      const { payload } = message;
      try {
        const messageToKeyserver = JSON.parse(payload);
        if (qrCodeAuthMessageValidator.is(messageToKeyserver)) {
          const request: QRCodeAuthMessage = messageToKeyserver;
          const [qrCodeAuthMessage, rustAPI] = await Promise.all([
            this.parseQRCodeAuthMessage(request),
            getRustAPI(),
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
          const nonceSignature = await signUsingOlmAccount(nonce);

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
          this.shouldNotifyPrimaryAfterReopening = true;
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
      message.type ===
      tunnelbrokerToDeviceMessageTypes.DEVICE_TO_TUNNELBROKER_REQUEST_STATUS
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
    } else if (message.type === tunnelbrokerToDeviceMessageTypes.HEARTBEAT) {
      const heartbeat: Heartbeat = {
        type: deviceToTunnelbrokerMessageTypes.HEARTBEAT,
      };
      this.ws.send(JSON.stringify(heartbeat));
    }
  };

  refreshOneTimeKeys: (numberOfKeys: number) => void = numberOfKeys => {
    const oldOneTimeKeysPromise = this.oneTimeKeysPromise;
    this.oneTimeKeysPromise = (async () => {
      try {
        await oldOneTimeKeysPromise;
        await uploadNewOneTimeKeys(numberOfKeys);
      } catch (e) {
        console.error('Encountered error when trying to upload new OTKs:', e);
      } finally {
        verifyMemoryUsage('otk refresh');
      }
    })();
  };

  debouncedRefreshOneTimeKeys: (numberOfKeys: number) => void = _debounce(
    this.refreshOneTimeKeys,
    100,
    { leading: true, trailing: true },
  );

  sendMessageToDevice: (
    message: TunnelbrokerClientMessageToDevice,
  ) => Promise<void> = (message: TunnelbrokerClientMessageToDevice) => {
    if (!this.connected) {
      throw new Error('Tunnelbroker not connected');
    }
    const clientMessageID = uuid.v4();
    const messageToDevice: MessageToDeviceRequest = {
      type: deviceToTunnelbrokerMessageTypes.MESSAGE_TO_DEVICE_REQUEST,
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

    let encryptedContent;
    try {
      const payloadBytes = convertObjToBytes(payload);
      const keyBytes = hexToUintArray(encryptionKey);
      const encryptedBytes = await encrypt(keyBytes, payloadBytes);
      encryptedContent = Buffer.from(encryptedBytes).toString('base64');
    } catch (e) {
      console.error(
        'Error encoding QRCodeAuthMessagePayload:',
        getMessageForException(e),
      );
      return null;
    }

    return {
      type: peerToPeerMessageTypes.QR_CODE_AUTH_MESSAGE,
      encryptedContent,
    };
  };
}

export { createAndMaintainTunnelbrokerWebsocket };
