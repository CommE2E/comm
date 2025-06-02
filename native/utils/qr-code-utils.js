// @flow

import { hexToUintArray } from 'lib/media/data-utils.js';
import {
  peerToPeerMessageTypes,
  type QRCodeAuthMessage,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import {
  qrCodeAuthMessagePayloadValidator,
  type QRCodeAuthMessagePayload,
} from 'lib/types/tunnelbroker/qr-code-auth-message-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import * as AES from './aes-crypto-module.js';
import {
  appOutOfDateAlertDetails,
  backupIsNewerThanAppAlertDetails,
  networkErrorAlertDetails,
  unknownErrorAlertDetails,
} from './alert-messages.js';
import Alert from './alert.js';
import {
  convertBytesToObj,
  convertObjToBytes,
} from '../backup/conversion-utils.js';
import { commUtilsModule } from '../native-modules.js';

function composeTunnelbrokerQRAuthMessage(
  encryptionKey: string,
  obj: QRCodeAuthMessagePayload,
): Promise<QRCodeAuthMessage> {
  const objBytes = convertObjToBytes(obj);
  const keyBytes = hexToUintArray(encryptionKey);
  const encryptedBytes = AES.encrypt(keyBytes, objBytes);
  const encryptedContent = commUtilsModule.base64EncodeBuffer(
    encryptedBytes.buffer,
  );
  return Promise.resolve({
    type: peerToPeerMessageTypes.QR_CODE_AUTH_MESSAGE,
    encryptedContent,
  });
}

function parseTunnelbrokerQRAuthMessage(
  encryptionKey: string,
  message: QRCodeAuthMessage,
): Promise<?QRCodeAuthMessagePayload> {
  const encryptedData = commUtilsModule.base64DecodeBuffer(
    message.encryptedContent,
  );
  const decryptedData = AES.decrypt(
    hexToUintArray(encryptionKey),
    new Uint8Array(encryptedData),
  );
  const payload = convertBytesToObj<QRCodeAuthMessagePayload>(decryptedData);
  if (!qrCodeAuthMessagePayloadValidator.is(payload)) {
    return Promise.resolve(null);
  }

  return Promise.resolve(payload);
}

function handleSecondaryDeviceLogInError(error: mixed): void {
  console.error('Secondary device log in error:', error);
  const messageForException = getMessageForException(error);
  if (
    messageForException === 'client_version_unsupported' ||
    messageForException === 'unsupported_version'
  ) {
    Alert.alert(
      appOutOfDateAlertDetails.title,
      appOutOfDateAlertDetails.message,
    );
  } else if (messageForException === 'network_error') {
    Alert.alert(
      networkErrorAlertDetails.title,
      networkErrorAlertDetails.message,
    );
  } else if (messageForException === 'backup_is_newer') {
    Alert.alert(
      backupIsNewerThanAppAlertDetails.title,
      backupIsNewerThanAppAlertDetails.message,
    );
  } else {
    Alert.alert(
      unknownErrorAlertDetails.title,
      unknownErrorAlertDetails.message,
    );
  }
}

function generateQRAuthAESKey(): Promise<Uint8Array> {
  return Promise.resolve(AES.generateKey());
}

export {
  composeTunnelbrokerQRAuthMessage,
  parseTunnelbrokerQRAuthMessage,
  handleSecondaryDeviceLogInError,
  generateQRAuthAESKey,
};
