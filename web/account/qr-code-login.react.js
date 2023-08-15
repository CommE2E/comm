// @flow

import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';

import css from './qr-code-login.css';

function QrCodeLogin(): React.Node {
  return (
    <div className={css.qrContainer}>
      <h1 className={css.title}>Log in to Comm</h1>
      <h4 className={css.scanInstructions}>
        Open the Comm app on your phone and scan the QR code below
      </h4>
      <QRCodeSVG
        value="https://comm.app/"
        size={300}
        marginSize={4}
        level="L"
      />
      <div className={css.instructionsContainer}>
        <div className={css.instructionsTitle}>
          <b>How to find the scanner:</b>
        </div>
        <div className={css.instructionsStep}>
          Go to <b>Profile</b>
        </div>
        <div className={css.instructionsStep}>
          Select <b>Linked devices</b>
        </div>
        <div className={css.instructionsStep}>
          Click <b>Add</b> on the top right
        </div>
      </div>
    </div>
  );
}

export default QrCodeLogin;
