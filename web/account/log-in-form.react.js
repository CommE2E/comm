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
import {
  setPrimaryIdentityKeys,
  setNotificationIdentityKeys,
} from '../redux/crypto-store-reducer.js';
import { useSelector } from '../redux/redux-utils.js';

function LoginForm(): React.Node {
  const { openConnectModal } = useConnectModal();
  const { data: signer } = useSigner();
  const dispatch = useDispatch();

  const primaryIdentityPublicKeys = useSelector(
    state => state.cryptoStore.primaryIdentityKeys,
  );
  const notificationIdentityPublicKeys = useSelector(
    state => state.cryptoStore.notificationIdentityKeys,
  );

  React.useEffect(() => {
    (async () => {
      if (
        primaryIdentityPublicKeys !== null &&
        primaryIdentityPublicKeys !== undefined &&
        notificationIdentityPublicKeys !== null &&
        notificationIdentityPublicKeys !== undefined
      ) {
        return;
      }
      await olm.init();

      const identityAccount = new olm.Account();
      identityAccount.create();
      const { ed25519: identityED25519, curve25519: identityCurve25519 } =
        JSON.parse(identityAccount.identity_keys());

      dispatch({
        type: setPrimaryIdentityKeys,
        payload: { ed25519: identityED25519, curve25519: identityCurve25519 },
      });

      const notificationAccount = new olm.Account();
      notificationAccount.create();
      const {
        ed25519: notificationED25519,
        curve25519: notificationCurve25519,
      } = JSON.parse(notificationAccount.identity_keys());

      dispatch({
        type: setNotificationIdentityKeys,
        payload: {
          ed25519: notificationED25519,
          curve25519: notificationCurve25519,
        },
      });
    })();
  }, [dispatch, notificationIdentityPublicKeys, primaryIdentityPublicKeys]);

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
