// @flow

import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';

import { useSecondaryDeviceQRAuthURL } from 'lib/components/secondary-device-qr-auth-context-provider.react.js';

import css from './qr-code-login.css';
import LoadingIndicator from '../loading-indicator.react.js';

function QRCodeLogin(): React.Node {
  const qrCodeURL = useSecondaryDeviceQRAuthURL();

  const qrCodeComponent = React.useMemo(() => {
    if (qrCodeURL) {
      return <QRCodeSVG value={qrCodeURL} size={300} level="L" />;
    }
    return <LoadingIndicator status="loading" size="large" color="black" />;
  }, [qrCodeURL]);

  return (
    <div className={css.qrContainer}>
      <div className={css.title}>Log in to Comm</div>
      <div className={css.scanInstructions}>
        Open the Comm app on your phone and scan the QR code below:
      </div>
      <div className={css.qrCodeContainer}>{qrCodeComponent}</div>
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
