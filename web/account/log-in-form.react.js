// @flow

import olm from '@commapp/olm';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import uuid from 'uuid';
import { useWalletClient } from 'wagmi';

import { isDev } from 'lib/utils/dev-utils.js';

import css from './log-in-form.css';
import SIWEButton from './siwe-button.react.js';
import SIWELoginForm from './siwe-login-form.react.js';
import TraditionalLoginForm from './traditional-login-form.react.js';
import Button from '../components/button.react.js';
import OrBreak from '../components/or-break.react.js';
import { initOlm } from '../olm/olm-utils.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { setCryptoStore } from '../redux/crypto-store-reducer.js';
import { useSelector } from '../redux/redux-utils.js';

function LoginForm(): React.Node {
  const { openConnectModal } = useConnectModal();
  const { data: signer } = useWalletClient();
  const dispatch = useDispatch();

  const cryptoStore = useSelector(state => state.cryptoStore);

  React.useEffect(() => {
    (async () => {
      if (cryptoStore !== null && cryptoStore !== undefined) {
        return;
      }
      await initOlm();

      const identityAccount = new olm.Account();
      identityAccount.create();
      const { ed25519: identityED25519, curve25519: identityCurve25519 } =
        JSON.parse(identityAccount.identity_keys());

      const identityAccountPicklingKey = uuid.v4();
      const pickledIdentityAccount = identityAccount.pickle(
        identityAccountPicklingKey,
      );

      const notificationAccount = new olm.Account();
      notificationAccount.create();
      const {
        ed25519: notificationED25519,
        curve25519: notificationCurve25519,
      } = JSON.parse(notificationAccount.identity_keys());

      const notificationAccountPicklingKey = uuid.v4();
      const pickledNotificationAccount = notificationAccount.pickle(
        notificationAccountPicklingKey,
      );

      dispatch({
        type: setCryptoStore,
        payload: {
          primaryAccount: {
            picklingKey: identityAccountPicklingKey,
            pickledAccount: pickledIdentityAccount,
          },
          primaryIdentityKeys: {
            ed25519: identityED25519,
            curve25519: identityCurve25519,
          },
          notificationAccount: {
            picklingKey: notificationAccountPicklingKey,
            pickledAccount: pickledNotificationAccount,
          },
          notificationIdentityKeys: {
            ed25519: notificationED25519,
            curve25519: notificationCurve25519,
          },
        },
      });
    })();
  }, [dispatch, cryptoStore]);

  const onQRCodeLoginButtonClick = React.useCallback(() => {
    dispatch({
      type: updateNavInfoActionType,
      payload: {
        loginMethod: 'qr-code',
      },
    });
  }, [dispatch]);

  const qrCodeLoginButton = React.useMemo(() => {
    if (!isDev) {
      return null;
    }

    return (
      <div className={css.form_qrcode_login}>
        <Button
          variant="outline"
          type="submit"
          onClick={onQRCodeLoginButtonClick}
        >
          Sign in via QR Code
        </Button>
      </div>
    );
  }, [onQRCodeLoginButtonClick]);

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

export default LoginForm;
