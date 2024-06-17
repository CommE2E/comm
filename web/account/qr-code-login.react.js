// @flow

import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';

import { qrCodeLinkURL } from 'lib/facts/links.js';
import { useSecondaryDeviceLogIn } from 'lib/hooks/login-hooks.js';
import { useQRAuth } from 'lib/hooks/qr-auth.js';
import { generateKeyCommon } from 'lib/media/aes-crypto-utils-common.js';
import { uintArrayToHexString } from 'lib/media/data-utils.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';

import css from './qr-code-login.css';
import {
  composeTunnelbrokerQRAuthMessage,
  parseTunnelbrokerQRAuthMessage,
  useHandleSecondaryDeviceRegistrationError,
} from '../utils/qr-code-utils.js';

function QRCodeLogin(): React.Node {
  const [qrData, setQRData] =
    React.useState<?{ +deviceID: string, +aesKey: string }>();

  const { setUnauthorizedDeviceID } = useTunnelbroker();
  const generateQRCode = React.useCallback(async () => {
    try {
      const [ed25519, rawAESKey] = await Promise.all([
        getContentSigningKey(),
        generateKeyCommon(crypto),
      ]);
      const aesKeyAsHexString: string = uintArrayToHexString(rawAESKey);

      setUnauthorizedDeviceID(ed25519);
      setQRData({ deviceID: ed25519, aesKey: aesKeyAsHexString });
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }
  }, [setUnauthorizedDeviceID]);

  const handleError = useHandleSecondaryDeviceRegistrationError();

  const logInSecondaryDevice = useSecondaryDeviceLogIn();
  const performRegistration = React.useCallback(
    async (userID: string) => {
      try {
        await logInSecondaryDevice(userID);
      } catch (err) {
        handleError(err);
        void generateQRCode();
      }
    },
    [logInSecondaryDevice, handleError, generateQRCode],
  );

  React.useEffect(() => {
    void generateQRCode();
  }, [generateQRCode]);

  const qrCodeURL = React.useMemo(
    () => (qrData ? qrCodeLinkURL(qrData.aesKey, qrData.deviceID) : undefined),
    [qrData],
  );

  const qrAuthInput = React.useMemo(
    () => ({
      secondaryDeviceID: qrData?.deviceID,
      aesKey: qrData?.aesKey,
      performSecondaryDeviceRegistration: performRegistration,
      composeMessage: composeTunnelbrokerQRAuthMessage,
      processMessage: parseTunnelbrokerQRAuthMessage,
    }),
    [qrData, performRegistration],
  );
  useQRAuth(qrAuthInput);

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
