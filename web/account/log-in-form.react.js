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
import { setPrimaryIdentityKeys } from '../redux/primary-identity-public-key-reducer.js';
import { useSelector } from '../redux/redux-utils.js';

function LoginForm(): React.Node {
  const { openConnectModal } = useConnectModal();
  const { data: signer } = useSigner();
  const dispatch = useDispatch();

  const primaryIdentityPublicKey = useSelector(
    state => state.primaryIdentityPublicKey,
  );

  React.useEffect(() => {
    (async () => {
      if (
        primaryIdentityPublicKey !== null &&
        primaryIdentityPublicKey !== undefined
      ) {
        return;
      }
      await olm.init();
      const identityAccount = new olm.Account();
      identityAccount.create();
      const { ed25519: identityED25519 } = JSON.parse(
        identityAccount.identity_keys(),
      );
      dispatch({
        type: setPrimaryIdentityKeys,
        payload: identityED25519,
      });
    })();
  }, [dispatch, primaryIdentityPublicKey]);

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
    </div>
  );
}

export default LoginForm;
