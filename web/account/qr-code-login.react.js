// @flow

import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';

import { qrCodeLinkURL } from 'lib/facts/links.js';
import { generateKeyCommon } from 'lib/media/aes-crypto-utils-common.js';
import { uintArrayToHexString } from 'lib/media/data-utils.js';

import css from './qr-code-login.css';
import { useSelector } from '../redux/redux-utils.js';

function QrCodeLogin(): React.Node {
  const [qrCodeValue, setQrCodeValue] = React.useState<?string>();
  const ed25519Key = useSelector(
    state => state.cryptoStore?.primaryIdentityKeys.ed25519,
  );

  const generateQRCode = React.useCallback(async () => {
    try {
      if (!ed25519Key) {
        return;
      }

      const rawAESKey: Uint8Array = await generateKeyCommon(crypto);
      const aesKeyAsHexString: string = uintArrayToHexString(rawAESKey);

      const url = qrCodeLinkURL(aesKeyAsHexString, ed25519Key);
      setQrCodeValue(url);
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  }, [ed25519Key]);

  React.useEffect(() => {
    generateQRCode();
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
