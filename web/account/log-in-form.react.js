// @flow

import { useConnectModal } from '@rainbow-me/rainbowkit';
import classnames from 'classnames';
import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';
import { useWalletClient } from 'wagmi';

import ModalOverlay from 'lib/components/modal-overlay.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import {
  useSecondaryDeviceQRAuthURL,
  useSecondaryDeviceQRAuthContext,
} from 'lib/components/secondary-device-qr-auth-context-provider.react.js';
import stores from 'lib/facts/stores.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import {
  useIsRestoreFlowEnabled,
  useFullBackupSupportEnabled,
} from 'lib/utils/services-utils.js';

import HeaderSeparator from './header-separator.react.js';
import css from './log-in-form.css';
import RestorationProgress from './restoration.react.js';
import SIWEButton from './siwe-button.react.js';
import SIWELoginForm from './siwe-login-form.react.js';
import TraditionalLoginForm from './traditional-login-form.react.js';
import Button from '../components/button.react.js';
import OrBreak from '../components/or-break.react.js';
import LoadingIndicator from '../loading-indicator.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';

function LegacyLoginForm() {
  const { openConnectModal } = useConnectModal();
  const { data: signer } = useWalletClient();
  const dispatch = useDispatch();

  const onQRCodeLoginButtonClick = React.useCallback(() => {
    dispatch({
      type: updateNavInfoActionType,
      payload: {
        loginMethod: 'qr-code',
      },
    });
  }, [dispatch]);

  const qrCodeLoginButton = React.useMemo(
    () => (
      <div className={css.form_qrcode_login}>
        <Button
          variant="outline"
          type="submit"
          onClick={onQRCodeLoginButtonClick}
        >
          Sign in via QR Code
        </Button>
      </div>
    ),
    [onQRCodeLoginButtonClick],
  );

  const [siweAuthFlowSelected, setSIWEAuthFlowSelected] =
    React.useState<boolean>(false);

  const onSIWEButtonClick = React.useCallback(() => {
    setSIWEAuthFlowSelected(true);
    openConnectModal && openConnectModal();
  }, [openConnectModal]);

  const cancelSIWEAuthFlow = React.useCallback(() => {
    setSIWEAuthFlowSelected(false);
  }, []);

  if (siweAuthFlowSelected && signer) {
    return (
      <div className={css.modal_body}>
        <SIWELoginForm cancelSIWEAuthFlow={cancelSIWEAuthFlow} />
      </div>
    );
  }

  return (
    <div className={css.modal_body}>
      <TraditionalLoginForm />
      <OrBreak />
      <SIWEButton onSIWEButtonClick={onSIWEButtonClick} />
      {qrCodeLoginButton}
    </div>
  );
}

function LoginForm() {
  const qrCodeURL = useSecondaryDeviceQRAuthURL();
  const { qrAuthInProgress } = useSecondaryDeviceQRAuthContext();

  const { pushModal, clearModals, popModal } = useModalContext();

  React.useEffect(() => {
    return clearModals;
  }, [clearModals]);

  const openRecoveryModal = React.useCallback(() => {
    pushModal(
      <ModalOverlay onClose={popModal}>
        <div className={classnames(css.new_modal_body, css.small_modal)}>
          <div className={css.content}>
            <div className={css.modal_text}>
              To access Comm on web, you must first install Comm on your phone
              and then restore your account.
            </div>
            <div className={css.modal_text}>
              Download the Comm app on the&nbsp;
              <a href={stores.appStoreUrl} target="_blank" rel="noreferrer">
                App Store
              </a>
              &nbsp;or&nbsp;
              <a href={stores.googlePlayUrl} target="_blank" rel="noreferrer">
                Google Play Store
              </a>
              .
            </div>
          </div>
        </div>
      </ModalOverlay>,
    );
  }, [popModal, pushModal]);

  const openOldLoginModal = React.useCallback(() => {
    pushModal(
      <ModalOverlay onClose={popModal}>
        <div className={classnames(css.new_modal_body, css.small_modal)}>
          <div className={css.content}>
            <div className={css.modal_text}>
              We’ve replaced our login options on web with a QR code to improve
              account security.
            </div>
            <div className={css.modal_text}>
              In the old system, a malicious actor with access to Comm’s servers
              could insert a new device for any given user. They could then use
              that fake device to send messages that would appear to be coming
              from that user.
            </div>
            <div className={css.modal_text}>
              In the new system, all new devices must be signed by an existing
              device, which makes that sort of attack impossible.
            </div>
            <div className={css.modal_text}>
              As part of these changes, we now require registration to occur on
              a mobile device, since the user needs to have at least one device
              capable of scanning a QR code.
            </div>
          </div>
        </div>
      </ModalOverlay>,
    );
  }, [popModal, pushModal]);

  const qrCodeComponent = React.useMemo(() => {
    if (qrCodeURL) {
      return <QRCodeSVG value={qrCodeURL} size={195} level="L" />;
    }
    return <LoadingIndicator status="loading" size="large" color="black" />;
  }, [qrCodeURL]);

  const userDataRestoreStarted = useSelector(
    state => state.restoreBackupState.status !== 'no_backup',
  );

  const [errorUIShown, setErrorUIShown] = React.useState(false);

  const fullBackupSupport = useFullBackupSupportEnabled();

  if (
    fullBackupSupport &&
    (qrAuthInProgress || userDataRestoreStarted || errorUIShown)
  ) {
    return (
      <RestorationProgress
        qrAuthInProgress={qrAuthInProgress}
        userDataRestoreStarted={userDataRestoreStarted}
        onErrorUIToggle={setErrorUIShown}
      />
    );
  }

  return (
    <div className={css.new_modal_body}>
      <h1>Log in to Comm</h1>
      <HeaderSeparator />
      <div className={css.content}>
        <div className={css.modal_text}>
          Open the Comm app on your phone and scan the QR code below:
        </div>
        <div className={css.qrCodeContainer}>
          <div className={css.qrCodeWrapper}>{qrCodeComponent}</div>
        </div>
        <div className={css.modal_text}>
          How to find the scanner:
          <ul>
            <li>
              Go to <strong>Profile</strong>
            </li>
            <li>
              Select <strong>Linked devices</strong>
            </li>
            <li>
              Click <strong>Add</strong> on the top right
            </li>
          </ul>
        </div>
        <div className={css.buttons}>
          <button onClick={openRecoveryModal}>
            Not logged in on another phone?
          </button>
          <button onClick={openOldLoginModal}>
            Looking for the old login?
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginFormWrapper(): React.Node {
  const usingRestoreFlow = useIsRestoreFlowEnabled();
  if (!usingRestoreFlow) {
    return <LegacyLoginForm />;
  }
  return <LoginForm />;
}

export default LoginFormWrapper;
