// @flow

import { useConnectModal } from '@rainbow-me/rainbowkit';
import * as React from 'react';
import { useSigner } from 'wagmi';

import { isDev } from 'lib/utils/dev-utils';

import OrBreak from '../components/or-break.react.js';
import css from './log-in-form.css';
import SIWEButton from './siwe-button.react.js';
import SIWELoginForm from './siwe-login-form.react.js';
import TraditionalLoginForm from './traditional-login-form.react.js';

function LoginForm(): React.Node {
  const { openConnectModal } = useConnectModal();
  const { data: signer } = useSigner();

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

  let siweLoginForm, siweButton;
  if (isDev && siweAuthFlowSelected && signer) {
    siweLoginForm = <SIWELoginForm cancelSIWEAuthFlow={cancelSIWEAuthFlow} />;
  } else if (isDev) {
    siweButton = <SIWEButton onSIWEButtonClick={onSIWEButtonClick} />;
  }

  if (siweLoginForm) {
    return <div className={css.modal_body}>{siweLoginForm}</div>;
  }

  if (siweButton) {
    return (
      <div className={css.modal_body}>
        <TraditionalLoginForm />
        <OrBreak />
        {siweButton}
      </div>
    );
  }

  return (
    <div className={css.modal_body}>
      <TraditionalLoginForm />
    </div>
  );
}

export default LoginForm;
