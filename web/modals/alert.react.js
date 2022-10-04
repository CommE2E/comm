// @flow

import * as React from 'react';

import Button from '../components/button.react';
import css from './alert.css';
import { useModalContext } from './modal-provider.react';
import Modal from './modal.react';

type AlertProps = {
  +title: string,
  +children: string,
};
function Alert(props: AlertProps): React.Node {
  const { title, children } = props;
  const { popModal } = useModalContext();

  return (
    <Modal name={title} onClose={popModal}>
      <div className={css.modal_body}>
        <p>{children}</p>
        <Button
          onClick={popModal}
          type="submit"
          variant="filled"
          className={css.ok_button}
        >
          OK
        </Button>
      </div>
    </Modal>
  );
}

export default Alert;
