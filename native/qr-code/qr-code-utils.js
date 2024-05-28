// @flow

import { hexToUintArray } from 'lib/media/data-utils.js';
import type {
  RawDeviceList,
  SignedDeviceList,
} from 'lib/types/identity-service-types.js';
import {
  peerToPeerMessageTypes,
  type QRCodeAuthMessage,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import {
  qrCodeAuthMessagePayloadValidator,
  type QRCodeAuthMessagePayload,
} from 'lib/types/tunnelbroker/qr-code-auth-message-types.js';
import { getConfig } from 'lib/utils/config.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';

import {
  convertBytesToObj,
  convertObjToBytes,
} from '../backup/conversion-utils.js';
import { commUtilsModule } from '../native-modules.js';
import * as AES from '../utils/aes-crypto-module.js';

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

export { composeTunnelbrokerQRAuthMessage, parseTunnelbrokerQRAuthMessage };
