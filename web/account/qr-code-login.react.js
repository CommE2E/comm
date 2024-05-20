// @flow

import invariant from 'invariant';
import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';

import { identityLogInActionTypes } from 'lib/actions/user-actions.js';
import { QRAuthHandler } from 'lib/components/qr-auth-handler.react.js';
import { qrCodeLinkURL } from 'lib/facts/links.js';
import { generateKeyCommon } from 'lib/media/aes-crypto-utils-common.js';
import * as AES from 'lib/media/aes-crypto-utils-common.js';
import { hexToUintArray, uintArrayToHexString } from 'lib/media/data-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type { SignedNonce } from 'lib/types/identity-service-types.js';
import {
  peerToPeerMessageTypes,
  type QRCodeAuthMessage,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import {
  qrCodeAuthMessagePayloadValidator,
  type QRCodeAuthMessagePayload,
} from 'lib/types/tunnelbroker/qr-code-auth-message-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import css from './qr-code-login.css';
import { olmAPI } from '../crypto/olm-api.js';
import {
  base64DecodeBuffer,
  base64EncodeBuffer,
} from '../utils/base64-utils.js';
import {
  convertBytesToObj,
  convertObjToBytes,
} from '../utils/conversion-utils.js';

async function composeTunnelbrokerMessage(
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

async function parseTunnelbrokerMessage(
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

function QRCodeLogin(): React.Node {
  const [deviceKeys, setDeviceKeys] =
    React.useState<?{ +deviceID: string, +aesKey: string }>();
  const { setUnauthorizedDeviceID } = useTunnelbroker();

  const identityContext = React.useContext(IdentityClientContext);
  const identityClient = identityContext?.identityClient;

  const dispatchActionPromise = useDispatchActionPromise();
  const performRegistration = React.useCallback(
    async (userID: string) => {
      invariant(identityClient, 'identity context not set');
      try {
        const nonce = await identityClient.generateNonce();
        const nonceSignature = await olmAPI.signMessage(nonce);
        const challengeResponse: SignedNonce = {
          nonce,
          nonceSignature,
        };

        await dispatchActionPromise(
          identityLogInActionTypes,
          identityClient.uploadKeysForRegisteredDeviceAndLogIn(
            userID,
            challengeResponse,
          ),
        );
        setUnauthorizedDeviceID(null);
      } catch (err) {
        console.error('Secondary device registration error:', err);
      }
    },
    [dispatchActionPromise, identityClient, setUnauthorizedDeviceID],
  );

  const generateQRCode = React.useCallback(async () => {
    try {
      const [ed25519, rawAESKey] = await Promise.all([
        getContentSigningKey(),
        generateKeyCommon(crypto),
      ]);
      const aesKeyAsHexString: string = uintArrayToHexString(rawAESKey);

      setUnauthorizedDeviceID(ed25519);
      setDeviceKeys({ deviceID: ed25519, aesKey: aesKeyAsHexString });
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  }, [setUnauthorizedDeviceID]);

  React.useEffect(() => {
    void generateQRCode();
  }, [generateQRCode]);

  const qrCodeURL = React.useMemo(
    () =>
      deviceKeys
        ? qrCodeLinkURL(deviceKeys.aesKey, deviceKeys.deviceID)
        : undefined,
    [deviceKeys],
  );

  return (
    <>
      <QRAuthHandler
        secondaryDeviceID={deviceKeys?.deviceID}
        aesKey={deviceKeys?.aesKey}
        performSecondaryDeviceRegistration={performRegistration}
        composeMessage={composeTunnelbrokerMessage}
        processMessage={parseTunnelbrokerMessage}
      />
      <div className={css.qrContainer}>
        <div className={css.title}>Log in to Comm</div>
        <div className={css.scanInstructions}>
          Open the Comm app on your phone and scan the QR code below
        </div>
        <QRCodeSVG value={qrCodeURL} size={300} marginSize={4} level="L" />
        <div className={css.instructionsContainer}>
          <div className={css.instructionsTitle}>How to find the scanner:</div>
          <div className={css.instructionsStep}>
            Go to <strong>Profile</strong>
          </div>
          <div className={css.instructionsStep}>
            Select <strong>Linked devices</strong>
          </div>
          <div className={css.instructionsStep}>
            Click <strong>Add</strong> on the top right
          </div>
        </div>
      </div>
    </>
  );
}

export default QRCodeLogin;
