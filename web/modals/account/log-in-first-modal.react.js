// @flow

import invariant from 'invariant';
import * as React from 'react';

import css from '../../style.css';
import Modal from '../modal.react';
import { ModalContext } from '../modal/modal-context';
import LogInModal from './log-in-modal.react';
type Props = {
  +inOrderTo: string,
};

function LogInFirstModal(props: Props): React.Node {
  const { inOrderTo } = props;
  const modalContext = React.useContext(ModalContext);
  invariant(modalContext, 'modalContext');

  const onClickLogIn = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      this.props.setModal(<LogInModal />);
    },
    [],
  );

  return (
    <Modal name="Log in" onClose={modalContext.clearModal}>
      <div className={css['modal-body']}>
        <p>
          {`In order to ${inOrderTo}, you'll first need to `}
          <a
            href="#"
            className={css['show-login-modal']}
            onClick={onClickLogIn}
          >
            log in
          </a>
          {'.'}
        </p>
      </div>
    </Modal>
  );
}

export default LogInFirstModal;
