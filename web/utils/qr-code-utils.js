// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import * as AES from 'lib/media/aes-crypto-utils-common.js';
import { generateKeyCommon } from 'lib/media/aes-crypto-utils-common.js';
import { hexToUintArray } from 'lib/media/data-utils.js';
import {
  peerToPeerMessageTypes,
  type QRCodeAuthMessage,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import {
  qrCodeAuthMessagePayloadValidator,
  type QRCodeAuthMessagePayload,
} from 'lib/types/tunnelbroker/qr-code-auth-message-types.js';
import {
  convertBytesToObj,
  convertObjToBytes,
} from 'lib/utils/conversion-utils.js';
import {
  BackupIsNewerError,
  getMessageForException,
} from 'lib/utils/errors.js';

import { base64DecodeBuffer, base64EncodeBuffer } from './base64-utils.js';
import { getBackupIsNewerThanAppError } from './version-utils.js';
import Alert from '../modals/alert.react.js';
import VersionUnsupportedModal from '../modals/version-unsupported-modal.react.js';

async function composeTunnelbrokerQRAuthMessage(
  encryptionKey: string,
  obj: QRCodeAuthMessagePayload,
): Promise<QRCodeAuthMessage> {
  const objBytes = convertObjToBytes(obj);
  const keyBytes = hexToUintArray(encryptionKey);
  const encryptedBytes = await AES.encryptCommon(crypto, keyBytes, objBytes);
  const encryptedContent = base64EncodeBuffer(encryptedBytes);
  return {
    type: peerToPeerMessageTypes.QR_CODE_AUTH_MESSAGE,
    encryptedContent,
  };
}

async function parseTunnelbrokerQRAuthMessage(
  encryptionKey: string,
  message: QRCodeAuthMessage,
): Promise<?QRCodeAuthMessagePayload> {
  const encryptedData = base64DecodeBuffer(message.encryptedContent);
  const decryptedData = await AES.decryptCommon(
    crypto,
    hexToUintArray(encryptionKey),
    new Uint8Array(encryptedData),
  );
  const payload = convertBytesToObj<QRCodeAuthMessagePayload>(decryptedData);
  if (!qrCodeAuthMessagePayloadValidator.is(payload)) {
    return null;
  }

  return payload;
}

function useHandleSecondaryDeviceLogInError(): (
  error: mixed,
  isUserDataRestoreError?: boolean,
) => void {
  const { pushModal } = useModalContext();
  return React.useCallback(
    (error: mixed, isUserDataRestoreError?: boolean) => {
      console.error('Secondary device log in error:', error);
      const messageForException = getMessageForException(error);
      if (isUserDataRestoreError) {
        // This is handled directly by the RestorationError component
        return;
      } else if (
        messageForException === 'client_version_unsupported' ||
        messageForException === 'unsupported_version'
      ) {
        pushModal(<VersionUnsupportedModal />);
      } else if (messageForException === 'network_error') {
        pushModal(
          <Alert title="Network error">
            Failed to contact Comm services. Please check your network
            connection.
          </Alert>,
        );
      } else if (error instanceof BackupIsNewerError) {
        const message = getBackupIsNewerThanAppError();
        pushModal(<Alert title="App out of date">{message}</Alert>);
      } else {
        pushModal(<Alert title="Unknown error">Uhh... try again?</Alert>);
      }
    },
    [pushModal],
  );
}

function generateQRAuthAESKey(): Promise<Uint8Array> {
  return generateKeyCommon(crypto);
}

export {
  composeTunnelbrokerQRAuthMessage,
  parseTunnelbrokerQRAuthMessage,
  useHandleSecondaryDeviceLogInError,
  generateQRAuthAESKey,
};
