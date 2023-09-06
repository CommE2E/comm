// @flow

import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';

import { qrCodeLinkUrl } from 'lib/facts/links.js';

import css from './qr-code-login.css';
import { generateKey } from '../media/aes-crypto-utils.js';

const defaultDeviceEd25519Key = 'device_ed25519_key';

function QrCodeLogin(): React.Node {
  const [qrCodeValue, setQrCodeValue] = React.useState<?string>();

  const generateQRCode = async () => {
    try {
      const aes256Key: Uint8Array = await generateKey();
      const url = qrCodeLinkUrl(aes256Key, defaultDeviceEd25519Key);
      setQrCodeValue(url);
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  };

  React.useEffect(() => {
    generateQRCode();
  }, []);

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
