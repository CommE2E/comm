// @flow

import { hexToUintArray } from 'lib/media/data-utils.js';
import type { BackupKeys } from 'lib/types/backup-types.js';
import {
  peerToPeerMessageTypes,
  type QRCodeAuthMessage,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import {
  qrCodeAuthMessagePayloadValidator,
  type QRCodeAuthMessagePayload,
} from 'lib/types/tunnelbroker/qr-code-auth-message-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import {
  convertBytesToObj,
  convertObjToBytes,
} from '../backup/conversion-utils.js';
import { commCoreModule, commUtilsModule } from '../native-modules.js';
import { persistConfig } from '../redux/persist.js';
import * as AES from '../utils/aes-crypto-module.js';
import {
  appOutOfDateAlertDetails,
  unknownErrorAlertDetails,
} from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

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

function handleSecondaryDeviceRegistrationError(error: Error): void {
  console.error('Secondary device registration error:', error);
  const messageForException = getMessageForException(error);
  if (
    messageForException === 'client_version_unsupported' ||
    messageForException === 'Unsupported version'
  ) {
    Alert.alert(
      appOutOfDateAlertDetails.title,
      appOutOfDateAlertDetails.message,
    );
  } else {
    Alert.alert(
      unknownErrorAlertDetails.title,
      unknownErrorAlertDetails.message,
    );
  }
}

function performBackupRestore(backupKeys: BackupKeys): Promise<void> {
  const { backupID, backupDataKey, backupLogDataKey } = backupKeys;
  return commCoreModule.restoreBackupData(
    backupID,
    backupDataKey,
    backupLogDataKey,
    persistConfig.version.toString(),
  );
}

export {
  composeTunnelbrokerQRAuthMessage,
  parseTunnelbrokerQRAuthMessage,
  handleSecondaryDeviceRegistrationError,
  performBackupRestore,
};
