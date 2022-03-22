// @flow

import * as React from 'react';

import LoginForm from '../../account/log-in-form.react.js';
import { useModalContext } from '../modal-provider.react';
import Modal from '../modal.react';

function LoginModal(): React.Node {
  const modalContext = useModalContext();
  return (
    <Modal name="Log in" onClose={modalContext.clearModal}>
      <LoginForm />
    </Modal>
  );
}

export default LoginModal;
