// @flow

import olm from '@matrix-org/olm';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { useSigner } from 'wagmi';

import css from './log-in-form.css';
import SIWEButton from './siwe-button.react.js';
import SIWELoginForm from './siwe-login-form.react.js';
import TraditionalLoginForm from './traditional-login-form.react.js';
import OrBreak from '../components/or-break.react.js';
import { setPrimaryIdentityPublicKey } from '../redux/primary-identity-public-key-reducer.js';

function LoginForm(): React.Node {
  const { openConnectModal } = useConnectModal();
  const { data: signer } = useSigner();
  const dispatch = useDispatch();

  React.useEffect(() => {
    (async () => {
      await olm.init();
      const account = new olm.Account();
      account.create();
      const { ed25519 } = JSON.parse(account.identity_keys());
      dispatch({
        type: setPrimaryIdentityPublicKey,
        payload: ed25519,
      });
    })();
  }, [dispatch]);

  const [
    siweAuthFlowSelected,
    setSIWEAuthFlowSelected,
  ] = React.useState<boolean>(false);

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
    </div>
  );
}

export default LoginForm;
