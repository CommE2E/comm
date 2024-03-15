// @flow

import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';

import { qrCodeLinkURL } from 'lib/facts/links.js';
import { generateKeyCommon } from 'lib/media/aes-crypto-utils-common.js';
import { uintArrayToHexString } from 'lib/media/data-utils.js';

import css from './qr-code-login.css';
import { olmAPI } from '../crypto/olm-api.js';

function QrCodeLogin(): React.Node {
  const [qrCodeValue, setQrCodeValue] = React.useState<?string>();

  const generateQRCode = React.useCallback(async () => {
    try {
      await olmAPI.initializeCryptoAccount();
      const {
        primaryIdentityPublicKeys: { ed25519 },
      } = await olmAPI.getUserPublicKey();
      if (!ed25519) {
        return;
      }

      const rawAESKey: Uint8Array = await generateKeyCommon(crypto);
      const aesKeyAsHexString: string = uintArrayToHexString(rawAESKey);

      const url = qrCodeLinkURL(aesKeyAsHexString, ed25519);
      setQrCodeValue(url);
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  }, []);

  React.useEffect(() => {
    void generateQRCode();
  }, [generateQRCode]);

  return (
    <div className={css.qrContainer}>
      <div className={css.title}>Log in to Comm</div>
      <div className={css.scanInstructions}>
        Open the Comm app on your phone and scan the QR code below
      </div>
      <QRCodeSVG value={qrCodeValue} size={300} marginSize={4} level="L" />
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
  );
}

export default QrCodeLogin;
