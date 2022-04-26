// @flow

import * as React from 'react';

import LoginForm from '../../account/log-in-form.react';
import { useModalContext } from '../modal-provider.react';
import Modal from '../modal.react';

function LoginModal(): React.Node {
  const modalContext = useModalContext();
  return (
    <Modal name="Log in" onClose={modalContext.popModal}>
      <LoginForm />
    </Modal>
  );
}

export default LoginModal;
