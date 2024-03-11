// @flow

import {
  peerToPeerMessageTypes,
  type QRCodeAuthMessage,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import {
  qrCodeAuthMessagePayloadValidator,
  type QRCodeAuthMessagePayload,
} from '../types/tunnelbroker/qr-code-auth-message-types.js';

function createQRAuthTunnelbrokerMessage(
  encryptionKey: string,
  payload: QRCodeAuthMessagePayload,
): QRCodeAuthMessage {
  return {
    type: peerToPeerMessageTypes.QR_CODE_AUTH_MESSAGE,
    encryptedContent: JSON.stringify(payload),
  };
}

function parseQRAuthTunnelbrokerMessage(
  encryptionKey: string,
  message: QRCodeAuthMessage,
): ?QRCodeAuthMessagePayload {
  const payload = JSON.parse(message.encryptedContent);
  if (!qrCodeAuthMessagePayloadValidator.is(payload)) {
    return null;
  }

  return payload;
}

export { createQRAuthTunnelbrokerMessage, parseQRAuthTunnelbrokerMessage };
