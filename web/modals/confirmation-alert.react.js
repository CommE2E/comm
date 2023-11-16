// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './confirmation-alert.css';
import Modal from './modal.react.js';
import Button, { buttonThemes } from '../components/button.react.js';

type Props = {
  +children: React.Node,
  +title: string,
  +confirmationButtonContent: React.Node,
  +onConfirm: () => mixed,
  +isDestructive?: boolean,
};

function ConfirmationAlert(props: Props): React.Node {
  const {
    children,
    title,
    confirmationButtonContent,
    onConfirm,
    isDestructive = false,
  } = props;
  const { popModal } = useModalContext();

  return (
    <Modal name={title} onClose={popModal} size="large">
      {children}
      <div className={css.buttonsContainer}>
        <Button
          variant="outline"
          className={css.cancelButton}
          buttonColor={buttonThemes.outline}
          onClick={popModal}
        >
          Cancel
        </Button>
        <Button
          variant="filled"
          buttonColor={
            isDestructive ? buttonThemes.danger : buttonThemes.primary
          }
          onClick={onConfirm}
        >
          {confirmationButtonContent}
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmationAlert;
