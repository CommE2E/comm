// @flow

import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';

import { useQRAuthContext } from 'lib/components/qr-auth-provider.react.js';
import { qrCodeLinkURL } from 'lib/facts/links.js';

import css from './qr-code-login.css';

function QRCodeLogin(): React.Node {
  const { qrData, generateQRCode } = useQRAuthContext();

  React.useEffect(() => {
    void generateQRCode();
  }, [generateQRCode]);

  const qrCodeURL = React.useMemo(
    () => (qrData ? qrCodeLinkURL(qrData.aesKey, qrData.deviceID) : undefined),
    [qrData],
  );

  return (
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
  );
}

export default QRCodeLogin;
