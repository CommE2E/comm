// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './alert.css';
import Modal from './modal.react.js';
import Button from '../components/button.react.js';

type AlertProps = {
  +title: string,
  +children: string,
};
function Alert(props: AlertProps): React.Node {
  const { title, children } = props;
  const { popModal } = useModalContext();

  const primaryButton = React.useMemo(
    () => (
      <Button onClick={popModal} type="submit" variant="filled">
        OK
      </Button>
    ),
    [popModal],
  );

  return (
    <Modal name={title} onClose={popModal} primaryButton={primaryButton}>
      <div className={css.modal_body}>
        <p>{children}</p>
      </div>
    </Modal>
  );
}

export default Alert;
