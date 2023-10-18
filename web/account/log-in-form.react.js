// @flow

import { useConnectModal } from '@rainbow-me/rainbowkit';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { useWalletClient } from 'wagmi';

import { isDev } from 'lib/utils/dev-utils.js';

import { useGetOrCreateCryptoStore } from './account-hooks.js';
import css from './log-in-form.css';
import SIWEButton from './siwe-button.react.js';
import SIWELoginForm from './siwe-login-form.react.js';
import TraditionalLoginForm from './traditional-login-form.react.js';
import Button from '../components/button.react.js';
import OrBreak from '../components/or-break.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';

function LoginForm(): React.Node {
  const { openConnectModal } = useConnectModal();
  const { data: signer } = useWalletClient();
  const dispatch = useDispatch();

  const getOrCreateCryptoStore = useGetOrCreateCryptoStore();

  React.useEffect(() => {
    async () => {
      await getOrCreateCryptoStore();
    };
  }, [getOrCreateCryptoStore]);

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
