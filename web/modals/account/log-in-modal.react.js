// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import LoginForm from '../../account/log-in-form.react.js';
import Modal from '../modal.react.js';

function LoginModal(): React.Node {
  const modalContext = useModalContext();
  return (
    <Modal name="Log in" onClose={modalContext.popModal}>
      <LoginForm />
    </Modal>
  );
}

export default LoginModal;
